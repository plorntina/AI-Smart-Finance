const mongoose = require('mongoose');

const EXPENSE_CATEGORIES = [
  'food', 'transport', 'housing', 'utilities', 'healthcare',
  'entertainment', 'education', 'shopping', 'subscriptions',
  'travel', 'personal', 'other',
];

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: { values: EXPENSE_CATEGORIES, message: '{VALUE} is not a valid category' },
      trim: true,
    },
    limit: {
      type: Number,
      required: [true, 'Budget limit is required'],
      min: [0.01, 'Budget limit must be greater than 0'],
    },
    // Month this budget applies to — stored as "YYYY-MM" string.
    // Allows per-month budget tracking as used by BudgetsPage.
    month: {
      type: String,
      required: [true, 'Month is required'],
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format'],
    },
  },
  { timestamps: true }
);

// Each user may have only one budget per category per month
budgetSchema.index({ userId: 1, category: 1, month: 1 }, { unique: true });

budgetSchema.statics.CATEGORIES = EXPENSE_CATEGORIES;

module.exports = mongoose.model('Budget', budgetSchema);
