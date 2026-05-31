const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { CLIENT_URL } = require('./config/env');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Route modules
const authRoutes        = require('./routes/auth.routes');
const transactionRoutes = require('./routes/transaction.routes');
const dashboardRoutes   = require('./routes/dashboard.routes');
const budgetRoutes      = require('./routes/budget.routes');
const billRoutes        = require('./routes/bill.routes');
const aiRoutes          = require('./routes/ai.routes');

const app = express();

// ── Security ──────────────────────────────────────────────
app.use(helmet());

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

// Global rate limiter: 100 requests / 15 min per IP
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests. Please try again later.' },
  })
);

// Auth-specific stricter limiter: 10 attempts / 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
});

// ── Body parsing ──────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────
app.get('/health', (req, res) =>
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
);

// ── API Routes ─────────────────────────────────────────────
const API = '/api/v1';
app.use(`${API}/auth`,         authLimiter, authRoutes);
app.use(`${API}/transactions`, transactionRoutes);
app.use(`${API}/dashboard`,    dashboardRoutes);
app.use(`${API}/budgets`,      budgetRoutes);
app.use(`${API}/bills`,        billRoutes);
app.use(`${API}/ai`,           aiRoutes);

// ── Error handling ────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
