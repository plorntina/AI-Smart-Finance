// ─────────────────────────────────────────────────────────────────────────────
// Phase 13A — Rate Limiting
//
// 1. Add to backend/package.json dependencies:
//      "express-rate-limit": "^7.5.0"
//    then run: npm install
//
// 2. Create this file at: backend/middleware/rateLimiter.js
// ─────────────────────────────────────────────────────────────────────────────

"use strict";

const rateLimit = require("express-rate-limit");

/**
 * RFC-7807 Problem Details JSON handler for 429 responses.
 * https://www.rfc-editor.org/rfc/rfc7807
 */
const rfc7807Handler = (req, res /*, next, options*/) => {
  res.status(429).json({
    type: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429",
    title: "Too Many Requests",
    status: 429,
    detail: "You have exceeded the allowed request rate. Please wait and try again.",
    instance: req.originalUrl,
    retryAfter: Math.ceil(res.getHeader("Retry-After") ?? 60),
  });
};

/**
 * Global limiter — applied to ALL /api/v1/ routes.
 * 100 requests per 15-minute window per IP.
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 100,
  standardHeaders: "draft-7",  // RateLimit-* headers (IETF draft 7)
  legacyHeaders: false,        // disable X-RateLimit-* headers
  handler: rfc7807Handler,
  // Use req.ip (works behind proxies when app.set('trust proxy', 1) is set)
  keyGenerator: (req) => req.ip,
});

/**
 * Auth limiter — applied only to POST /auth/login and POST /auth/register.
 * 10 requests per 15-minute window per IP.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: rfc7807Handler,
  keyGenerator: (req) => req.ip,
  // Skip successful requests so only failed attempts count toward the limit
  skipSuccessfulRequests: false,
});

module.exports = { globalLimiter, authLimiter };


// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — Patch server.js
//
// Add near the top of server.js (after other requires):
//
//   const { globalLimiter } = require('./middleware/rateLimiter');
//
// Then add ONE line before your route registrations:
//
//   app.set('trust proxy', 1);          // trust first proxy (Railway / Render / Vercel)
//   app.use('/api/v1', globalLimiter);  // global rate limit
//
// ─────────────────────────────────────────────────────────────────────────────
//
// STEP 4 — Patch backend/routes/auth.routes.js
//
// Add at the top:
//   const { authLimiter } = require('../middleware/rateLimiter');
//
// Then apply to the two sensitive routes:
//   router.post('/register', authLimiter, register);
//   router.post('/login',    authLimiter, login);
//
// Leave GET /me and POST /logout unchanged (they use `protect` middleware only).
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Example of a 429 response body:
// {
//   "type": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429",
//   "title": "Too Many Requests",
//   "status": 429,
//   "detail": "You have exceeded the allowed request rate. Please wait and try again.",
//   "instance": "/api/v1/auth/login",
//   "retryAfter": 843
// }
// ─────────────────────────────────────────────────────────────────────────────
