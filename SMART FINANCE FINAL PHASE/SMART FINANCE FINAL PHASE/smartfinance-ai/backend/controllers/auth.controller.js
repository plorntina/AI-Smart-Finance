// backend/controllers/auth.controller.js  —  FULL REPLACEMENT (Phase 16)
// ─────────────────────────────────────────────────────────────────────────────
// Change from P14: the `refresh` handler now returns BOTH
// { accessToken, refreshToken } so the client can persist the rotated token.
// ─────────────────────────────────────────────────────────────────────────────

"use strict";

const authService = require("../services/auth.service");

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const result = await authService.register({ name, email, password });
    res.status(201).json({ status: "success", data: result });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    res.status(200).json({ status: "success", data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/refresh
 * Body:    { refreshToken: string }
 * Returns: { status, data: { accessToken, refreshToken } }
 *
 * Both tokens must be saved by the client — the old refresh token is
 * invalidated server-side on every call (rotation).
 */
async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: "refreshToken is required" });
    }
    // authService now returns { accessToken, refreshToken }
    const result = await authService.refreshAccessToken(refreshToken);
    res.status(200).json({ status: "success", data: result });
  } catch (err) {
    next(err);
  }
}

/** POST /auth/logout  (protected) */
async function logout(req, res, next) {
  try {
    await authService.logout(req.user._id);
    res.status(200).json({ status: "success", message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await authService.getMe(req.user._id);
    res.status(200).json({ status: "success", data: { user } });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout, getMe };
