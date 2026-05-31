const Transaction = require('../models/Transaction');

/**
 * Aggregate total income, total expenses, and net balance for a user.
 * Uses a single aggregation pipeline for efficiency.
 *
 * @param {string|ObjectId} userId
 * @param {object} [dateFilter] — optional { $gte: Date, $lte: Date } for date-scoped totals
 * @returns {{ totalIncome, totalExpenses, balance }}
 */
const calculateBalance = async (userId, dateFilter = null) => {
  const matchStage = { userId };
  if (dateFilter) matchStage.date = dateFilter;

  const result = await Transaction.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
      },
    },
  ]);

  let totalIncome = 0;
  let totalExpenses = 0;

  result.forEach(({ _id, total }) => {
    if (_id === 'income') totalIncome = total;
    if (_id === 'expense') totalExpenses = total;
  });

  return {
    totalIncome: parseFloat(totalIncome.toFixed(2)),
    totalExpenses: parseFloat(totalExpenses.toFixed(2)),
    balance: parseFloat((totalIncome - totalExpenses).toFixed(2)),
  };
};

/**
 * Monthly breakdown — returns an array of { month, totalIncome, totalExpenses, balance }
 * for the last N months. Used by the frontend balance chart.
 *
 * @param {string|ObjectId} userId
 * @param {number} months  — how many months back to include (default 6)
 */
const calculateMonthlyBreakdown = async (userId, months = 6) => {
  const since = new Date();
  since.setMonth(since.getMonth() - months + 1);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const result = await Transaction.aggregate([
    {
      $match: {
        userId,
        date: { $gte: since },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
          type: '$type',
        },
        total: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  // Build a map: "YYYY-MM" → { income, expense }
  const map = {};
  result.forEach(({ _id, total }) => {
    const key = `${_id.year}-${String(_id.month).padStart(2, '0')}`;
    if (!map[key]) map[key] = { income: 0, expense: 0 };
    map[key][_id.type] = total;
  });

  return Object.entries(map)
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([month, { income = 0, expense = 0 }]) => ({
      month,
      totalIncome: parseFloat(income.toFixed(2)),
      totalExpenses: parseFloat(expense.toFixed(2)),
      balance: parseFloat((income - expense).toFixed(2)),
    }));
};

module.exports = { calculateBalance, calculateMonthlyBreakdown };
