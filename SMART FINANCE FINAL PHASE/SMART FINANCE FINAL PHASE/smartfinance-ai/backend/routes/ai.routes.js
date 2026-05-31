const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { generateReport, getReports } = require('../controllers/ai.controller');

router.use(protect);

router.post('/generate', generateReport);
router.get('/reports', getReports);

module.exports = router;
