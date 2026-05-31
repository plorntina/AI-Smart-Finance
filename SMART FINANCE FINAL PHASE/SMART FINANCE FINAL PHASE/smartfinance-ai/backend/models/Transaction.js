const mongoose = require('mongoose');

const CATEGORIES = {
  income: ['salary', 'freelance', 'investment', 'gift', 'refund', 'other'],
  expense: [
    'food',
    'transport',
    'housing',
    'utilities',
    'healthcare',
    'entertainment',
    'education',
    'shopping',
    'subscriptions',
    'travel',
    'personal',
    'other',
  ],
};

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: [true, 'Transaction type is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters'],
      default: '',
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound index for efficient per-user queries
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1 });
transactionSchema.index({ userId: 1, category: 1 });

transactionSchema.statics.CATEGORIES = CATEGORIES;

module.exports = mongoose.model('Transaction', transactionSchema);
