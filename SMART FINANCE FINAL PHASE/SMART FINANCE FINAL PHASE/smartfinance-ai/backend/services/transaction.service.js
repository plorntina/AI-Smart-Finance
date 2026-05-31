'use strict';

const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a MongoDB filter object from common query params.
 */
function buildFilter(userId, { type, category, startDate, endDate } = {}) {
  const match = { userId: new mongoose.Types.ObjectId(userId) };

  if (type && ['income', 'expense'].includes(type)) {
    match.type = type;
  }

  if (category) {
    match.category = category.trim();
  }

  if (startDate || endDate) {
    match.date = {};
    if (startDate) match.date.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      match.date.$lte = end;
    }
  }

  return match;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

/**
 * Create a transaction.
 */
const createTransaction = async (userId, { type, amount, category, description, date }) => {
  const transaction = await Transaction.create({
    userId,
    type,
    amount,
    category: category.trim(),
    description: description ? description.trim() : '',
    date: date ? new Date(date) : Date.now(),
  });
  return transaction;
};

/**
 * Get paginated transactions for a user with optional filters.
 */
const getTransactions = async (userId, { type, category, startDate, endDate, page = 1, limit = 20 } = {}) => {
  const match = buildFilter(userId, { type, category, startDate, endDate });
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    Transaction.find(match)
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Transaction.countDocuments(match),
  ]);

  return {
    transactions,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Get a single transaction by ID — owner-only.
 */
const getTransactionById = async (userId, transactionId) => {
  if (!mongoose.Types.ObjectId.isValid(transactionId)) {
    const err = new Error('Invalid transaction id.');
    err.statusCode = 400;
    throw err;
  }

  const transaction = await Transaction.findOne({
    _id: transactionId,
    userId,
  }).lean();

  if (!transaction) {
    const err = new Error('Transaction not found.');
    err.statusCode = 404;
    throw err;
  }

  return transaction;
};

/**
 * Update a transaction — owner-only.
 */
const updateTransaction = async (userId, transactionId, updates) => {
  if (!mongoose.Types.ObjectId.isValid(transactionId)) {
    const err = new Error('Invalid transaction id.');
    err.statusCode = 400;
    throw err;
  }

  const allowed = ['type', 'amount', 'category', 'description', 'date'];
  const safeUpdates = {};
  allowed.forEach((key) => {
    if (updates[key] !== undefined) {
      if (key === 'category' || key === 'description') {
        safeUpdates[key] = String(updates[key]).trim();
      } else if (key === 'date') {
        safeUpdates[key] = new Date(updates[key]);
      } else {
        safeUpdates[key] = updates[key];
      }
    }
  });

  const transaction = await Transaction.findOneAndUpdate(
    { _id: transactionId, userId },
    { $set: safeUpdates },
    { new: true, runValidators: true }
  );

  if (!transaction) {
    const err = new Error('Transaction not found.');
    err.statusCode = 404;
    throw err;
  }

  return transaction;
};

/**
 * Delete a transaction — owner-only.
 */
const deleteTransaction = async (userId, transactionId) => {
  if (!mongoose.Types.ObjectId.isValid(transactionId)) {
    const err = new Error('Invalid transaction id.');
    err.statusCode = 400;
    throw err;
  }

  const transaction = await Transaction.findOneAndDelete({ _id: transactionId, userId });

  if (!transaction) {
    const err = new Error('Transaction not found.');
    err.statusCode = 404;
    throw err;
  }

  return transaction;
};

// ── Export (Phase 15) ─────────────────────────────────────────────────────────

/**
 * Export transactions as CSV or XLSX for the authenticated user.
 *
 * @param {ObjectId|string} userId
 * @param {object}          filters  — { type, category, startDate, endDate }
 * @param {string}          format   — 'csv' | 'xlsx'
 * @returns {{ buffer: Buffer, contentType: string, filename: string }}
 */
const exportTransactions = async (userId, filters = {}, format = 'csv') => {
  const match = buildFilter(userId, filters);

  const transactions = await Transaction.find(match)
    .sort({ date: -1 })
    .lean();

  // ── CSV ───────────────────────────────────────────────────────────────────
  if (format === 'csv') {
    const escapeCell = (val) => {
      const str = val === null || val === undefined ? '' : String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const header = ['Date', 'Type', 'Category', 'Description', 'Amount'];
    const rows = transactions.map((t) => [
      new Date(t.date).toISOString().split('T')[0],
      t.type,
      t.category,
      t.description || '',
      t.amount.toFixed(2),
    ]);

    const csvLines = [header, ...rows].map((row) => row.map(escapeCell).join(','));
    const buffer = Buffer.from(csvLines.join('\r\n'), 'utf-8');

    return {
      buffer,
      contentType: 'text/csv; charset=utf-8',
      filename: `transactions_${Date.now()}.csv`,
    };
  }

  // ── XLSX ──────────────────────────────────────────────────────────────────
  if (format === 'xlsx') {
    const writeXlsxFile = require('write-excel-file/node');

    const HEADER_ROW = [
      { value: 'Date',        fontWeight: 'bold', width: 14 },
      { value: 'Type',        fontWeight: 'bold', width: 12 },
      { value: 'Category',    fontWeight: 'bold', width: 16 },
      { value: 'Description', fontWeight: 'bold', width: 38 },
      { value: 'Amount',      fontWeight: 'bold', width: 14 },
    ];

    const rows = [
      HEADER_ROW,
      ...transactions.map((t) => [
        { value: new Date(t.date).toISOString().split('T')[0], type: String  },
        { value: t.type,                                        type: String  },
        { value: t.category,                                    type: String  },
        { value: t.description || '',                           type: String  },
        { value: parseFloat(t.amount.toFixed(2)),               type: Number  },
      ]),
    ];

    const buffer = await writeXlsxFile(rows, { buffer: true });

    return {
      buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `transactions_${Date.now()}.xlsx`,
    };
  }

  const err = new Error('Invalid export format. Use csv or xlsx.');
  err.statusCode = 400;
  throw err;
};

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  exportTransactions,
};