const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const { calculateBalance, calculateMonthlyBreakdown } = require('../utils/calculateBalance');

/**
 * Build the complete dashboard payload for a user.
 *
 * Returns:
 *   totalBalance, totalIncome, totalExpenses
 *   recentTransactions  — last 5, newest first
 *   categoryBreakdown   — spending per expense category (current month)
 *   budgetSummary       — each budget with spent amount and remaining
 *   monthlyTrend        — last 6 months of income/expense data for charts
 */
const getDashboardData = async (userId) => {
  const objectUserId = new mongoose.Types.ObjectId(userId);

  // ── 1. All-time balance ──────────────────────────────────────────
  const { totalIncome, totalExpenses, balance } = await calculateBalance(objectUserId);

  // ── 2. Recent transactions (last 5) ─────────────────────────────
  const recentTransactions = await Transaction.find({ userId: objectUserId })
    .sort({ date: -1 })
    .limit(5)
    .lean();

  // ── 3. Current-month expense breakdown by category ───────────────
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const categoryBreakdown = await Transaction.aggregate([
    {
      $match: {
        userId: objectUserId,
        type: 'expense',
        date: { $gte: monthStart, $lte: monthEnd },
      },
    },
    {
      $group: {
        _id: '$category',
        spent: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { spent: -1 } },
    {
      $project: {
        _id: 0,
        category: '$_id',
        spent: { $round: ['$spent', 2] },
        count: 1,
      },
    },
  ]);

  // ── 4. Budget summary — join budgets with current-month spend ────
  const [budgets, monthlyExpenses] = await Promise.all([
    Budget.find({ userId: objectUserId }).lean(),
    Transaction.aggregate([
      {
        $match: {
          userId: objectUserId,
          type: 'expense',
          date: { $gte: monthStart, $lte: monthEnd },
        },
      },
      {
        $group: {
          _id: '$category',
          spent: { $sum: '$amount' },
        },
      },
    ]),
  ]);

  const spentMap = {};
  monthlyExpenses.forEach(({ _id, spent }) => {
    spentMap[_id] = spent;
  });

  const budgetSummary = budgets.map((budget) => {
    const spent = parseFloat((spentMap[budget.category] || 0).toFixed(2));
    const remaining = parseFloat((budget.limit - spent).toFixed(2));
    const percentUsed = budget.limit > 0 ? parseFloat(((spent / budget.limit) * 100).toFixed(1)) : 0;

    return {
      category: budget.category,
      limit: budget.limit,
      spent,
      remaining,
      percentUsed,
      isOverBudget: spent > budget.limit,
    };
  });

  // ── 5. Monthly trend (last 6 months) ────────────────────────────
  const monthlyTrend = await calculateMonthlyBreakdown(objectUserId, 6);

  return {
    totalBalance: balance,
    totalIncome,
    totalExpenses,
    recentTransactions,
    categoryBreakdown,
    budgetSummary,
    monthlyTrend,
    currentMonth: {
      label: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
    },
  };
};

module.exports = { getDashboardData };
