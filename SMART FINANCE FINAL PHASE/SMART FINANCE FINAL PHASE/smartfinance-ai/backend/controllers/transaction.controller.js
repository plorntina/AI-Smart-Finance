// ─────────────────────────────────────────────────────────────────────────────
// PHASE 15 — ADD THIS to transaction.controller.js
//
// 1. Destructure exportTransactions from the service require at the top:
//      const { ..., exportTransactions } = require('../services/transaction.service');
//
// 2. Add the handler below before module.exports.
//
// 3. Add  exportTransactions  to module.exports.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/transactions/export
 *
 * Query params:
 *   format      — 'csv' (default) | 'xlsx'
 *   type        — 'income' | 'expense'
 *   category    — exact category string
 *   startDate   — ISO date string
 *   endDate     — ISO date string
 */
'use strict';

const transactionService = require('../services/transaction.service');

/**
 * POST /api/v1/transactions
 * Body: { type, amount, category, description?, date? }
 */
const createTransaction = async (req, res, next) => {
  try {
    const { type, amount, category, description, date } = req.body;

    if (!type || amount === undefined || !category) {
      return res.status(400).json({ message: 'Type, amount, and category are required.' });
    }
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ message: 'Type must be "income" or "expense".' });
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number.' });
    }

    const transaction = await transactionService.createTransaction(req.user._id, {
      type, amount, category, description, date,
    });
    res.status(201).json({ success: true, transaction });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/transactions
 * Query: type, category, startDate, endDate, page, limit
 */
const getTransactions = async (req, res, next) => {
  try {
    const { type, category, startDate, endDate, page, limit } = req.query;
    const result = await transactionService.getTransactions(req.user._id, {
      type, category, startDate, endDate, page, limit,
    });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/transactions/export
 * Query: format (csv|xlsx), type, category, startDate, endDate
 */
const exportTransactions = async (req, res, next) => {
  try {
    const { format = 'csv', type, category, startDate, endDate } = req.query;

    if (!['csv', 'xlsx'].includes(format)) {
      return res.status(400).json({ message: "Invalid format. Use 'csv' or 'xlsx'." });
    }

    const { buffer, contentType, filename } = await transactionService.exportTransactions(
      req.user._id,
      { type, category, startDate, endDate },
      format
    );

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/transactions/:id
 */
const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await transactionService.getTransactionById(req.user._id, req.params.id);
    res.status(200).json({ success: true, transaction });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/transactions/:id
 */
const updateTransaction = async (req, res, next) => {
  try {
    const transaction = await transactionService.updateTransaction(req.user._id, req.params.id, req.body);
    res.status(200).json({ success: true, transaction });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/transactions/:id
 */
const deleteTransaction = async (req, res, next) => {
  try {
    await transactionService.deleteTransaction(req.user._id, req.params.id);
    res.status(200).json({ success: true, message: 'Transaction deleted.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  exportTransactions,
};