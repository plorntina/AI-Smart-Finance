#!/usr/bin/env node
/**
 * SmartFinance AI — Seed Script
 * Creates a demo user with 6 months of realistic transactions,
 * current-month budgets, and 3 recurring bills.
 *
 * Idempotent: safe to run multiple times — skips if demo user already exists.
 *
 * Usage:
 *   node scripts/seed.js
 *
 * Requires: MONGODB_URI in backend/.env (loaded via dotenv)
 */

"use strict";

require("dotenv").config(); // loads backend/.env

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// ─── Inline model definitions ─────────────────────────────────────────────────
// We redeclare lightweight schemas here so the script is self-contained and
// does not depend on the app's module paths.

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
});
const User = mongoose.models.User ?? mongoose.model("User", UserSchema);

const TransactionSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  type: String,       // "income" | "expense"
  amount: Number,
  category: String,
  description: String,
  date: Date,
});
const Transaction =
  mongoose.models.Transaction ??
  mongoose.model("Transaction", TransactionSchema);

const BudgetSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  category: String,
  limit: Number,
  month: String,      // YYYY-MM
});
const Budget = mongoose.models.Budget ?? mongoose.model("Budget", BudgetSchema);

const BillSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  name: String,
  amount: Number,
  dueDay: Number,
  frequency: String,  // "monthly" | "yearly"
  category: String,
  isPaid: Boolean,
  nextDueDate: Date,
});
const Bill = mongoose.models.Bill ?? mongoose.model("Bill", BillSchema);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a Date for the Nth day of a given year+month (0-indexed month). */
function dateOf(year, month, day) {
  return new Date(year, month, day);
}

/**
 * Generates realistic transaction rows for one calendar month.
 * @param {ObjectId} userId
 * @param {number} year
 * @param {number} month  0-indexed
 * @param {number} salaryBase  Base salary amount
 */
function transactionsForMonth(userId, year, month, salaryBase) {
  const d = (day) => dateOf(year, month, day);

  // Add ±5% random jitter to expense amounts for realism
  const jitter = (base) =>
    Math.round(base * (0.95 + Math.random() * 0.1));

  return [
    // ── Income ───────────────────────────────────────────────────────────────
    {
      userId,
      type: "income",
      amount: salaryBase,
      category: "Salary",
      description: "Monthly salary",
      date: d(1),
    },
    {
      userId,
      type: "income",
      amount: jitter(500000),
      category: "Freelance",
      description: "Freelance project payment",
      date: d(15),
    },

    // ── Food & Dining ─────────────────────────────────────────────────────────
    {
      userId,
      type: "expense",
      amount: jitter(850000),
      category: "Food",
      description: "Grocery shopping",
      date: d(3),
    },
    {
      userId,
      type: "expense",
      amount: jitter(120000),
      category: "Food",
      description: "Restaurant — lunch with colleagues",
      date: d(8),
    },
    {
      userId,
      type: "expense",
      amount: jitter(95000),
      category: "Food",
      description: "Coffee & snacks",
      date: d(20),
    },
    {
      userId,
      type: "expense",
      amount: jitter(450000),
      category: "Food",
      description: "Weekly groceries",
      date: d(25),
    },

    // ── Transport ─────────────────────────────────────────────────────────────
    {
      userId,
      type: "expense",
      amount: jitter(300000),
      category: "Transport",
      description: "Fuel",
      date: d(5),
    },
    {
      userId,
      type: "expense",
      amount: jitter(75000),
      category: "Transport",
      description: "Ride-hailing",
      date: d(12),
    },

    // ── Utilities ─────────────────────────────────────────────────────────────
    {
      userId,
      type: "expense",
      amount: jitter(250000),
      category: "Utilities",
      description: "Electricity bill",
      date: d(7),
    },
    {
      userId,
      type: "expense",
      amount: jitter(180000),
      category: "Utilities",
      description: "Internet & phone",
      date: d(10),
    },

    // ── Health ────────────────────────────────────────────────────────────────
    {
      userId,
      type: "expense",
      amount: jitter(200000),
      category: "Health",
      description: "Pharmacy",
      date: d(14),
    },

    // ── Entertainment ─────────────────────────────────────────────────────────
    {
      userId,
      type: "expense",
      amount: jitter(150000),
      category: "Entertainment",
      description: "Streaming subscriptions",
      date: d(2),
    },
    {
      userId,
      type: "expense",
      amount: jitter(200000),
      category: "Entertainment",
      description: "Books & apps",
      date: d(18),
    },

    // ── Shopping ─────────────────────────────────────────────────────────────
    {
      userId,
      type: "expense",
      amount: jitter(600000),
      category: "Shopping",
      description: "Clothing",
      date: d(22),
    },

    // ── Savings ───────────────────────────────────────────────────────────────
    {
      userId,
      type: "expense",
      amount: 1000000,
      category: "Savings",
      description: "Monthly savings transfer",
      date: d(28),
    },
  ];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌  MONGODB_URI is not set. Check your .env file.");
    process.exit(1);
  }

  console.log("🔌  Connecting to MongoDB…");
  await mongoose.connect(uri);
  console.log("✅  Connected.\n");

  // ── Demo user ──────────────────────────────────────────────────────────────
  const DEMO_EMAIL = "demo@smartfinance.app";
  const DEMO_PASSWORD = "Demo1234!";

  let user = await User.findOne({ email: DEMO_EMAIL });
  if (user) {
    console.log(
      `⚠️   Demo user already exists (${DEMO_EMAIL}). Skipping seed.\n` +
      `    Delete the user from MongoDB to re-seed.\n`
    );
    await mongoose.disconnect();
    return;
  }

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);
  user = await User.create({
    name: "Demo User",
    email: DEMO_EMAIL,
    password: hashedPassword,
  });
  console.log(`👤  Demo user created: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);

  // ── Transactions — last 6 months ───────────────────────────────────────────
  const now = new Date();
  const SALARY_BASE = 8_000_000; // IDR 8,000,000 / month
  let txDocs = [];

  for (let i = 5; i >= 0; i--) {
    // Go back i months from current month
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth(); // 0-indexed

    // Salary grows 1% each month
    const salary = Math.round(SALARY_BASE * Math.pow(1.01, 5 - i));

    txDocs.push(...transactionsForMonth(user._id, year, month, salary));
  }

  await Transaction.insertMany(txDocs);
  console.log(`💳  Inserted ${txDocs.length} transactions across 6 months.`);

  // ── Budgets — current month ────────────────────────────────────────────────
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const budgets = [
    { userId: user._id, category: "Food",          limit: 2_000_000, month: currentMonth },
    { userId: user._id, category: "Transport",      limit: 500_000,   month: currentMonth },
    { userId: user._id, category: "Utilities",      limit: 600_000,   month: currentMonth },
    { userId: user._id, category: "Entertainment",  limit: 400_000,   month: currentMonth },
    { userId: user._id, category: "Shopping",       limit: 800_000,   month: currentMonth },
    { userId: user._id, category: "Health",         limit: 500_000,   month: currentMonth },
    { userId: user._id, category: "Savings",        limit: 1_500_000, month: currentMonth },
  ];

  await Budget.insertMany(budgets);
  console.log(`📊  Inserted ${budgets.length} budgets for ${currentMonth}.`);

  // ── Bills ──────────────────────────────────────────────────────────────────
  /**
   * Compute nextDueDate: find the next occurrence of dueDay from today.
   */
  function nextDue(dueDay) {
    const today = new Date();
    const candidate = new Date(today.getFullYear(), today.getMonth(), dueDay);
    if (candidate <= today) {
      // Already passed this month — move to next month
      candidate.setMonth(candidate.getMonth() + 1);
    }
    return candidate;
  }

  const bills = [
    {
      userId: user._id,
      name: "Internet & Phone",
      amount: 350_000,
      dueDay: 10,
      frequency: "monthly",
      category: "Utilities",
      isPaid: false,
      nextDueDate: nextDue(10),
    },
    {
      userId: user._id,
      name: "Electricity",
      amount: 280_000,
      dueDay: 20,
      frequency: "monthly",
      category: "Utilities",
      isPaid: false,
      nextDueDate: nextDue(20),
    },
    {
      userId: user._id,
      name: "Annual Domain & Hosting",
      amount: 1_200_000,
      dueDay: 15,
      frequency: "yearly",
      category: "Entertainment",
      isPaid: false,
      nextDueDate: nextDue(15),
    },
  ];

  await Bill.insertMany(bills);
  console.log(`🧾  Inserted ${bills.length} bills.`);

  // ── Done ───────────────────────────────────────────────────────────────────
  console.log(`
✅  Seed complete!

    Login credentials
    ─────────────────
    Email   : ${DEMO_EMAIL}
    Password: ${DEMO_PASSWORD}

    Data seeded
    ───────────
    Transactions : ${txDocs.length} (6 months)
    Budgets      : ${budgets.length} (current month)
    Bills        : ${bills.length}
`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("💥  Seed failed:", err.message);
  process.exit(1);
});
