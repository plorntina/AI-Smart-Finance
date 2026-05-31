const budgetService = require('../services/budget.service');

/**
 * GET /api/v1/budgets?month=YYYY-MM
 * Returns budgets enriched with spent/remaining/percentUsed for the given month.
 * Defaults to current month if no month param provided.
 */
const getBudgets = async (req, res, next) => {
  try {
    const budgets = await budgetService.getBudgets(req.user._id, req.query.month);
    res.status(200).json({ success: true, budgets });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/budgets
 * Body: { category, limit, month? }
 */
const createBudget = async (req, res, next) => {
  try {
    const { category, limit, month } = req.body;
    if (!category || limit === undefined) {
      return res.status(400).json({ message: 'Category and limit are required.' });
    }
    if (typeof limit !== 'number' || limit <= 0) {
      return res.status(400).json({ message: 'Limit must be a positive number.' });
    }
    const budget = await budgetService.createBudget(req.user._id, { category, limit, month });
    res.status(201).json({ success: true, budget });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/budgets/:id
 */
const updateBudget = async (req, res, next) => {
  try {
    const budget = await budgetService.updateBudget(req.user._id, req.params.id, req.body);
    res.status(200).json({ success: true, budget });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/budgets/:id
 */
const deleteBudget = async (req, res, next) => {
  try {
    await budgetService.deleteBudget(req.user._id, req.params.id);
    res.status(200).json({ success: true, message: 'Budget deleted.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getBudgets, createBudget, updateBudget, deleteBudget };
