const mongoose = require('mongoose');
const Bill = require('../models/Bill');

/**
 * Get all bills for a user, sorted by nextDueDate ascending.
 */
const getBills = async (userId) => {
  return Bill.find({ userId }).sort({ nextDueDate: 1 }).lean();
};

/**
 * Create a new bill.
 */
const createBill = async (userId, { name, amount, dueDay, frequency = 'monthly', category = 'utilities', isPaid = false }) => {
  const bill = await Bill.create({
    userId,
    name: name.trim(),
    amount,
    dueDay: Number(dueDay),
    frequency,
    category,
    isPaid,
  });
  return bill;
};

/**
 * Update a bill — owner-only.
 */
const updateBill = async (userId, billId, updates) => {
  if (!mongoose.Types.ObjectId.isValid(billId)) {
    const err = new Error('Invalid bill id.');
    err.statusCode = 400;
    throw err;
  }

  const allowed = ['name', 'amount', 'dueDay', 'frequency', 'category', 'isPaid'];
  const safeUpdates = {};
  allowed.forEach((key) => {
    if (updates[key] !== undefined) {
      if (key === 'name')   safeUpdates[key] = updates[key].trim();
      else if (key === 'dueDay') safeUpdates[key] = Number(updates[key]);
      else safeUpdates[key] = updates[key];
    }
  });

  const bill = await Bill.findOneAndUpdate(
    { _id: billId, userId },
    { $set: safeUpdates },
    { new: true, runValidators: true }
  );

  if (!bill) {
    const err = new Error('Bill not found.');
    err.statusCode = 404;
    throw err;
  }
  return bill;
};

/**
 * Toggle the isPaid flag — owner-only.
 * Used by PATCH /api/v1/bills/:id/toggle-paid
 */
const togglePaid = async (userId, billId) => {
  if (!mongoose.Types.ObjectId.isValid(billId)) {
    const err = new Error('Invalid bill id.');
    err.statusCode = 400;
    throw err;
  }

  const bill = await Bill.findOne({ _id: billId, userId });
  if (!bill) {
    const err = new Error('Bill not found.');
    err.statusCode = 404;
    throw err;
  }

  bill.isPaid = !bill.isPaid;
  await bill.save();
  return bill;
};

/**
 * Delete a bill — owner-only.
 */
const deleteBill = async (userId, billId) => {
  if (!mongoose.Types.ObjectId.isValid(billId)) {
    const err = new Error('Invalid bill id.');
    err.statusCode = 400;
    throw err;
  }

  const bill = await Bill.findOneAndDelete({ _id: billId, userId });
  if (!bill) {
    const err = new Error('Bill not found.');
    err.statusCode = 404;
    throw err;
  }
  return bill;
};

module.exports = { getBills, createBill, updateBill, togglePaid, deleteBill };
