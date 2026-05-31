/**
 * middleware/errorHandler.js
 * Central error handling middleware for Express.
 */

/**
 * 404 handler — catches unmatched routes.
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Global error handler.
 * Reads statusCode from the error object (set by services) or defaults to 500.
 */
const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || err.status || 500;

  // Don't leak internal stack traces in production
  const isDev = process.env.NODE_ENV !== 'production';

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error.',
    ...(isDev && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
