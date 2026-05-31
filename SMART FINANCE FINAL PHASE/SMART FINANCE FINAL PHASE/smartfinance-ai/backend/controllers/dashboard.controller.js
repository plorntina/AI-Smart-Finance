const dashboardService = require('../services/dashboard.service');

/**
 * GET /api/v1/dashboard
 * Returns the complete dashboard payload for the authenticated user.
 */
const getDashboard = async (req, res, next) => {
  try {
    const data = await dashboardService.getDashboardData(req.user._id);
    res.status(200).json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboard };
