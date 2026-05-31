"use strict";

require("dotenv").config();

const required = ["MONGODB_URI", "JWT_SECRET", "REFRESH_TOKEN_SECRET"];
const missing  = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[env] Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

module.exports = {
  // ── Server ──────────────────────────────────────────────────────────────
  PORT:     process.env.PORT     || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",

  // ── Database ────────────────────────────────────────────────────────────
  MONGODB_URI: process.env.MONGODB_URI,

  // ── JWT (access token) ──────────────────────────────────────────────────
  JWT_SECRET:     process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "15m",

  // ── JWT (refresh token) ─────────────────────────────────────────────────
  REFRESH_TOKEN_SECRET:     process.env.REFRESH_TOKEN_SECRET,
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || "30d",

  // ── OpenAI ──────────────────────────────────────────────────────────────
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",

  // ── Email / SMTP ────────────────────────────────────────────────────────
  SMTP_HOST: process.env.SMTP_HOST || "smtp.gmail.com",
  SMTP_PORT: process.env.SMTP_PORT || "587",
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  SMTP_FROM: process.env.SMTP_FROM || "noreply@smartfinance.app",
};
