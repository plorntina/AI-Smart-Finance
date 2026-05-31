// backend/services/auth.service.js  —  FULL REPLACEMENT (Phase 16)
// ─────────────────────────────────────────────────────────────────────────────
// Change from P14: refreshAccessToken() now calls issueTokenPair() and returns
// BOTH { accessToken, refreshToken }, rotating the refresh token on every use.
// ─────────────────────────────────────────────────────────────────────────────

"use strict";

const jwt    = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User   = require("../models/User");
const env    = require("../config/env");

// ─── Token helpers ────────────────────────────────────────────────────────────

function signAccessToken(userId) {
  return jwt.sign({ id: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN || "15m",
  });
}

function signRefreshToken(userId) {
  return jwt.sign({ id: userId }, env.REFRESH_TOKEN_SECRET, {
    expiresIn: env.REFRESH_TOKEN_EXPIRES_IN || "30d",
  });
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Issues a new access + refresh token pair, hashes and persists the refresh
 * token on the user document, and returns the plain-text pair for the client.
 */
async function issueTokenPair(user) {
  const accessToken  = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  await User.findByIdAndUpdate(user._id, {
    refreshToken: hashToken(refreshToken),
  });

  return { accessToken, refreshToken };
}

// ─── Auth operations ──────────────────────────────────────────────────────────

async function register({ name, email, password }) {
  const existing = await User.findOne({ email });
  if (existing) {
    const err = new Error("Email already in use");
    err.statusCode = 409;
    throw err;
  }

  const user   = await User.create({ name, email, password });

  const tokens = await issueTokenPair(user);
  return { user: { _id: user._id, name: user.name, email: user.email }, ...tokens };
}

async function login({ email, password }) {
  const user = await User.findOne({ email }).select("+password +refreshToken");
  if (!user) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

  const tokens = await issueTokenPair(user);
  return { user: { _id: user._id, name: user.name, email: user.email }, ...tokens };
}

/**
 * Verifies an incoming refresh token, checks it against the stored hash,
 * then ROTATES: issues a brand-new token pair and invalidates the old one.
 *
 * Returns { accessToken, refreshToken } — both must be saved by the client.
 *
 * Security properties:
 *  • The old refresh token is immediately invalidated (one-time-use).
 *  • If a superseded token is replayed, the hash mismatch branch fires,
 *    the stored token is cleared, and the user is fully logged out.
 */
async function refreshAccessToken(incomingRefreshToken) {
  // 1. Verify signature & expiry
  let payload;
  try {
    payload = jwt.verify(incomingRefreshToken, env.REFRESH_TOKEN_SECRET);
  } catch {
    const err = new Error("Invalid or expired refresh token");
    err.statusCode = 401;
    throw err;
  }

  // 2. Load user + stored hash
  const user = await User.findById(payload.id).select("+refreshToken");
  if (!user || !user.refreshToken) {
    const err = new Error("Refresh token not found");
    err.statusCode = 401;
    throw err;
  }

  const incomingHash = hashToken(incomingRefreshToken);

  if (user.refreshToken !== incomingHash) {
    // Token reuse detected — full session invalidation
    await User.findByIdAndUpdate(payload.id, { refreshToken: null });
    const err = new Error("Refresh token reuse detected — please log in again");
    err.statusCode = 401;
    throw err;
  }

  // 3. Rotate: issue a new pair (issueTokenPair overwrites the stored hash)
  const tokens = await issueTokenPair(user);
  return tokens; // { accessToken, refreshToken }
}

async function logout(userId) {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
}

async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  return user;
}

module.exports = { register, login, refreshAccessToken, logout, getMe };