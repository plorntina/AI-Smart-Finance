const OpenAI = require('openai');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const AIReport = require('../models/AIReport');
const { OPENAI_API_KEY } = require('../config/env');

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const VALID_REPORT_TYPES = ['monthly', 'spending_analysis', 'savings_tips'];

// ── Prompt builder ────────────────────────────────────────────────────────────

/**
 * Fetch the last 90 days of transactions + all budgets for a user,
 * then format them into a concise string context for the LLM.
 *
 * @param {string|ObjectId} userId
 * @returns {string} formatted context block
 */
const buildPrompt = async (userId) => {
  const objectUserId = new mongoose.Types.ObjectId(userId);
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const [transactions, budgets] = await Promise.all([
    Transaction.find({ userId: objectUserId, date: { $gte: since } })
      .sort({ date: -1 })
      .limit(200)
      .lean(),
    Budget.find({ userId: objectUserId }).lean(),
  ]);

  // Aggregate income / expenses
  let totalIncome = 0;
  let totalExpenses = 0;
  const categoryTotals = {};

  transactions.forEach(({ type, amount, category }) => {
    if (type === 'income') totalIncome += amount;
    if (type === 'expense') {
      totalExpenses += amount;
      categoryTotals[category] = (categoryTotals[category] || 0) + amount;
    }
  });

  const balance = totalIncome - totalExpenses;

  // Format category breakdown
  const categoryLines = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, amt]) => `  - ${cat}: $${amt.toFixed(2)}`)
    .join('\n');

  // Format budget lines
  const budgetLines = budgets.length
    ? budgets
        .map(({ category, limit }) => {
          const spent = categoryTotals[category] || 0;
          const status = spent > limit ? 'OVER BUDGET' : 'within budget';
          return `  - ${category}: limit $${limit.toFixed(2)}, spent $${spent.toFixed(2)} (${status})`;
        })
        .join('\n')
    : '  None set.';

  // Recent 10 transactions
  const recentLines = transactions
    .slice(0, 10)
    .map(({ type, amount, category, description, date }) => {
      const d = new Date(date).toISOString().split('T')[0];
      const desc = description ? ` — ${description}` : '';
      return `  - [${d}] ${type.toUpperCase()} $${amount.toFixed(2)} (${category})${desc}`;
    })
    .join('\n');

  return `
FINANCIAL SUMMARY (last 90 days):
  Total income:   $${totalIncome.toFixed(2)}
  Total expenses: $${totalExpenses.toFixed(2)}
  Net balance:    $${balance.toFixed(2)}
  Transactions:   ${transactions.length}

EXPENSE BREAKDOWN BY CATEGORY:
${categoryLines || '  No expenses recorded.'}

BUDGETS:
${budgetLines}

RECENT TRANSACTIONS (last 10):
${recentLines || '  No recent transactions.'}
`.trim();
};

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a personal finance advisor. You provide clear, concise, and actionable insights based on a user's real financial data. Always:
- Be specific and reference actual numbers from the data provided.
- Keep the response under 400 words.
- Use plain text only — no markdown headers, no bullet symbols, just short paragraphs.
- End with 2-3 concrete action items the user can take this week.
- Be encouraging but honest about problem areas.`;

// ── Report type instructions ──────────────────────────────────────────────────

const REPORT_INSTRUCTIONS = {
  monthly: 'Provide a monthly financial review. Summarize income vs expenses, highlight the biggest spending categories, assess whether the user is saving enough, and give specific recommendations.',
  spending_analysis: 'Analyse the user\'s spending patterns in detail. Identify the top spending categories, flag any unusual expenses, compare actual spend against budget limits, and suggest where they could cut back.',
  savings_tips: 'Focus on savings opportunities. Based on the user\'s spending data, identify the top 3 areas where they are overspending and give specific, realistic tips to save money in each area.',
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate an AI report for the user, save it to MongoDB, and return the doc.
 *
 * @param {string} userId
 * @param {string} reportType  — "monthly" | "spending_analysis" | "savings_tips"
 */
const generateReport = async (userId, reportType) => {
  if (!VALID_REPORT_TYPES.includes(reportType)) {
    const err = new Error(`Invalid report type. Must be one of: ${VALID_REPORT_TYPES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  const financialContext = await buildPrompt(userId);
  const userInstruction = REPORT_INSTRUCTIONS[reportType];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 800,
    temperature: 0.7,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Here is my financial data:\n\n${financialContext}\n\n${userInstruction}`,
      },
    ],
  });

  const summary = completion.choices[0]?.message?.content?.trim();
  if (!summary) {
    const err = new Error('AI did not return a response. Please try again.');
    err.statusCode = 502;
    throw err;
  }

  const report = await AIReport.create({ userId, reportType, summary });
  return report;
};

/**
 * Get all saved AI reports for a user, newest first.
 */
const getReports = async (userId) => {
  return AIReport.find({ userId }).sort({ createdAt: -1 }).lean();
};

module.exports = { generateReport, getReports, buildPrompt };
