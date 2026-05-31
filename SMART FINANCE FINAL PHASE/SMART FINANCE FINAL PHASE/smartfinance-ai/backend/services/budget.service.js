const mongoose = require('mongoose');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

/**
 * Parse a "YYYY-MM" string into { start, end } Date range covering that month.
 */
function monthRange(yyyyMM) {
  const [year, month] = yyyyMM.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 0, 23, 59, 59, 999); // last ms of last day
  return { start, end };
}

/**
 * Get current month string "YYYY-MM"
 */
function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get budgets for a given month, enriched with spent/remaining/percentUsed.
 * If no month provided, defaults to current month.
 *
 * @param {string|ObjectId} userId
 * @param {string} [month] — "YYYY-MM" format
 */
const getBudgets = async (userId, month) => {
  const targetMonth = month || currentMonth();
  const objectUserId = new mongoose.Types.ObjectId(userId);

  const { start, end } = monthRange(targetMonth);

  // Fetch budgets for this month
  const budgets = await Budget.find({ userId: objectUserId, month: targetMonth })
    .sort({ category: 1 })
    .lean();

  if (budgets.length === 0) return [];

  // Aggregate expenses for the same month, grouped by category
  const expenseAgg = await Transaction.aggregate([
    {
      $match: {
        userId: objectUserId,
        type: 'expense',
        date: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: '$category',
        spent: { $sum: '$amount' },
      },
    },
  ]);

  const spentMap = {};
  expenseAgg.forEach(({ _id, spent }) => {
    spentMap[_id] = spent;
  });

  return budgets.map((budget) => {
    const spent       = parseFloat((spentMap[budget.category] || 0).toFixed(2));
    const remaining   = parseFloat((budget.limit - spent).toFixed(2));
    const percentUsed = budget.limit > 0
      ? parseFloat(((spent / budget.limit) * 100).toFixed(1))
      : 0;

    return {
      ...budget,
      spent,
      remaining,
      percentUsed,
      isOverBudget: spent > budget.limit,
    };
  });
};

/**
 * Create a budget.
 * Throws 409 if a budget for that category+month already exists.
 */
const createBudget = async (userId, { category, limit, month }) => {
  const targetMonth = month || currentMonth();
  try {
    const budget = await Budget.create({
      userId,
      category: category.trim(),
      limit,
      month: targetMonth,
    });
    return { ...budget.toObject(), spent: 0, remaining: limit, percentUsed: 0, isOverBudget: false };
  } catch (err) {
    if (err.code === 11000) {
      const error = new Error(`A budget for "${category}" already exists for ${targetMonth}.`);
      error.statusCode = 409;
      throw error;
    }
    throw err;
  }
};

/**
 * Update an existing budget (limit and/or category).
 */
const updateBudget = async (userId, budgetId, updates) => {
  if (!mongoose.Types.ObjectId.isValid(budgetId)) {
    const err = new Error('Invalid budget id.');
    err.statusCode = 400;
    throw err;
  }

  const allowed = ['category', 'limit'];
  const safeUpdates = {};
  allowed.forEach((key) => {
    if (updates[key] !== undefined) {
      safeUpdates[key] = key === 'category' ? updates[key].trim() : updates[key];
    }
  });

  try {
    const budget = await Budget.findOneAndUpdate(
      { _id: budgetId, userId },
      { $set: safeUpdates },
      { new: true, runValidators: true }
    );

    if (!budget) {
      const err = new Error('Budget not found.');
      err.statusCode = 404;
      throw err;
    }
    return budget;
  } catch (err) {
    if (err.code === 11000) {
      const error = new Error(`A budget for "${safeUpdates.category}" already exists for that month.`);
      error.statusCode = 409;
      throw error;
    }
    throw err;
  }
};

/**
 * Delete a budget — owner-only.
 */
const deleteBudget = async (userId, budgetId) => {
  if (!mongoose.Types.ObjectId.isValid(budgetId)) {
    const err = new Error('Invalid budget id.');
    err.statusCode = 400;
    throw err;
  }

  const budget = await Budget.findOneAndDelete({ _id: budgetId, userId });
  if (!budget) {
    const err = new Error('Budget not found.');
    err.statusCode = 404;
    throw err;
  }
  return budget;
};

module.exports = { getBudgets, createBudget, updateBudget, deleteBudget };
