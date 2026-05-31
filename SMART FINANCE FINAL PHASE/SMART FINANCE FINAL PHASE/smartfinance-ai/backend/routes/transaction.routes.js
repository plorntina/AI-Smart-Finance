// backend/routes/transaction.routes.js  —  FULL REPLACEMENT (Phase 15)
// ─────────────────────────────────────────────────────────────────────────────
// The /export route MUST appear before /:id so Express doesn't try to treat
// "export" as a MongoDB ObjectId parameter.
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  exportTransactions,       // ← NEW (Phase 15)
} = require('../controllers/transaction.controller');

// All transaction routes require authentication
router.use(protect);

// ── Collection routes ─────────────────────────────────────────────────────────
router.route('/').get(getTransactions).post(createTransaction);

// ── Export route (MUST come before /:id) ─────────────────────────────────────
// GET /api/v1/transactions/export?format=csv|xlsx&type=&category=&startDate=&endDate=
router.get('/export', exportTransactions);                        // ← NEW

// ── Single-resource routes ────────────────────────────────────────────────────
router
  .route('/:id')
  .get(getTransactionById)
  .put(updateTransaction)
  .delete(deleteTransaction);

module.exports = router;
