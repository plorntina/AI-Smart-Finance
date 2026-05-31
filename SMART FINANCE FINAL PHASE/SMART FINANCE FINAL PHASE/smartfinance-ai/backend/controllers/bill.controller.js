const billService = require('../services/bill.service');

/**
 * GET /api/v1/bills
 */
const getBills = async (req, res, next) => {
  try {
    const bills = await billService.getBills(req.user._id);
    res.status(200).json({ success: true, bills });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/bills
 * Body: { name, amount, dueDay, frequency?, category?, isPaid? }
 */
const createBill = async (req, res, next) => {
  try {
    const { name, amount, dueDay, frequency, category, isPaid } = req.body;

    if (!name || !amount || !dueDay) {
      return res.status(400).json({ message: 'Name, amount, and dueDay are required.' });
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number.' });
    }
    const dayNum = Number(dueDay);
    if (!dayNum || dayNum < 1 || dayNum > 31) {
      return res.status(400).json({ message: 'Due day must be between 1 and 31.' });
    }

    const bill = await billService.createBill(req.user._id, {
      name, amount, dueDay: dayNum, frequency, category, isPaid,
    });
    res.status(201).json({ success: true, bill });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/bills/:id
 */
const updateBill = async (req, res, next) => {
  try {
    const bill = await billService.updateBill(req.user._id, req.params.id, req.body);
    res.status(200).json({ success: true, bill });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/bills/:id/toggle-paid
 * Toggles the isPaid flag for the given bill.
 */
const togglePaid = async (req, res, next) => {
  try {
    const bill = await billService.togglePaid(req.user._id, req.params.id);
    res.status(200).json({ success: true, bill });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/bills/:id
 */
const deleteBill = async (req, res, next) => {
  try {
    await billService.deleteBill(req.user._id, req.params.id);
    res.status(200).json({ success: true, message: 'Bill deleted.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getBills, createBill, updateBill, togglePaid, deleteBill };
