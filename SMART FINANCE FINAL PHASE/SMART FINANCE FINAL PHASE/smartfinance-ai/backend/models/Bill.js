const mongoose = require('mongoose');

const EXPENSE_CATEGORIES = [
  'food', 'transport', 'housing', 'utilities', 'healthcare',
  'entertainment', 'education', 'shopping', 'subscriptions',
  'travel', 'personal', 'other',
];

/**
 * Compute the next due date from a dueDay integer and a reference date.
 * If the dueDay has already passed this month, the next due date is next month.
 *
 * For yearly bills, the dueDay is the day-of-year the payment recurs on;
 * we store year-cycle due dates in the same field.
 */
function computeNextDueDate(dueDay, frequency = 'monthly') {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (frequency === 'yearly') {
    // Use dueDay as day-of-month for January (simple approach — full date can
    // be handled by the client if needed).
    const thisYear = new Date(today.getFullYear(), 0, dueDay);
    if (thisYear >= today) return thisYear;
    return new Date(today.getFullYear() + 1, 0, dueDay);
  }

  // Monthly
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), dueDay);
  if (thisMonth >= today) return thisMonth;
  // Roll to next month
  return new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
}

const billSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Bill name is required'],
      trim: true,
      maxlength: [100, 'Bill name cannot exceed 100 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    // Day of month (1–31) or day-of-year for yearly bills on which payment recurs.
    dueDay: {
      type: Number,
      required: [true, 'Due day is required'],
      min: [1, 'Due day must be at least 1'],
      max: [31, 'Due day cannot exceed 31'],
    },
    frequency: {
      type: String,
      enum: { values: ['monthly', 'yearly'], message: '{VALUE} is not a valid frequency' },
      default: 'monthly',
    },
    category: {
      type: String,
      enum: { values: EXPENSE_CATEGORIES, message: '{VALUE} is not a valid category' },
      default: 'utilities',
    },
    // Whether the bill has been paid for the current cycle.
    // Toggled via PATCH /bills/:id/toggle-paid
    isPaid: {
      type: Boolean,
      default: false,
    },
    // Computed and stored on save so queries can sort/filter by it cheaply.
    nextDueDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Recompute nextDueDate whenever dueDay, frequency, or isPaid changes.
billSchema.pre('save', function (next) {
  if (this.isModified('dueDay') || this.isModified('frequency') || this.isNew) {
    this.nextDueDate = computeNextDueDate(this.dueDay, this.frequency);
  }
  next();
});

// Also recompute on findOneAndUpdate when relevant fields change.
billSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  const set = update?.$set ?? update ?? {};
  if (set.dueDay !== undefined || set.frequency !== undefined) {
    const dueDay = set.dueDay ?? this._conditions.dueDay;
    const frequency = set.frequency ?? 'monthly';
    if (dueDay) {
      if (!update.$set) update.$set = {};
      update.$set.nextDueDate = computeNextDueDate(dueDay, frequency);
    }
  }
  next();
});

billSchema.index({ userId: 1, nextDueDate: 1 });

module.exports = mongoose.model('Bill', billSchema);
