const aiService = require('../services/ai.service');

/**
 * POST /api/v1/ai/generate
 * Body: { reportType: "monthly" | "spending_analysis" | "savings_tips" }
 */
const generateReport = async (req, res, next) => {
  try {
    const { reportType } = req.body;

    if (!reportType) {
      return res.status(400).json({ message: 'reportType is required.' });
    }

    const report = await aiService.generateReport(req.user._id, reportType);
    res.status(201).json({ success: true, report });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/ai/reports
 * Returns all saved AI reports for the authenticated user, newest first.
 */
const getReports = async (req, res, next) => {
  try {
    const reports = await aiService.getReports(req.user._id);
    res.status(200).json({ success: true, reports });
  } catch (error) {
    next(error);
  }
};

module.exports = { generateReport, getReports };
