const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getBills, createBill, updateBill, togglePaid, deleteBill } = require('../controllers/bill.controller');

router.use(protect);

router.route('/').get(getBills).post(createBill);
router.patch('/:id/toggle-paid', togglePaid);
router.route('/:id').put(updateBill).delete(deleteBill);

module.exports = router;
