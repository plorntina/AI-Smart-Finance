# SmartFinance AI

A full-stack personal finance web app with AI-powered spending analysis, budget alerts, bill reminders, interactive charts, and PDF/Excel exports.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Folder Structure](#folder-structure)
3. [Environment Variables](#environment-variables)
4. [Local Installation](#local-installation)
5. [Seeding Sample Data](#seeding-sample-data)
6. [API Reference](#api-reference)
7. [Deployment Guide](#deployment-guide)
8. [Final Project Checklist](#final-project-checklist)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend runtime | Node.js ≥ 18 · Express 4 |
| Database | MongoDB · Mongoose 8 |
| Authentication | JWT (access 15 m + refresh 30 d, rotation) |
| AI | OpenAI GPT-4o-mini |
| PDF export | PDFKit |
| Excel export | SheetJS (xlsx) |
| Email | Nodemailer (SMTP) |
| Scheduled jobs | node-cron |
| Rate limiting | express-rate-limit 7 |
| Frontend | React 18 · Vite · Tailwind CSS 3 |
| Charts | Recharts |
| Icons | Lucide React |
| HTTP client | Axios (with silent refresh interceptor) |
| Routing | React Router v6 |

---

## Folder Structure

```
smartfinance-ai/
├── backend/
│   ├── config/
│   │   ├── db.js                  # Mongoose connection
│   │   └── env.js                 # Env var validation + export
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── transaction.controller.js
│   │   ├── dashboard.controller.js
│   │   ├── budget.controller.js
│   │   ├── bill.controller.js
│   │   └── ai.controller.js
│   ├── jobs/
│   │   ├── billReminder.job.js    # Overdue bill email job
│   │   └── scheduler.js          # node-cron registration
│   ├── middleware/
│   │   ├── authMiddleware.js      # JWT protect()
│   │   ├── errorHandler.js        # Central error handler
│   │   └── rateLimiter.js         # Global + auth limiters
│   ├── models/
│   │   ├── User.js
│   │   ├── Transaction.js
│   │   ├── Budget.js
│   │   ├── Bill.js
│   │   └── AIReport.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── transaction.routes.js
│   │   ├── dashboard.routes.js
│   │   ├── budget.routes.js
│   │   ├── bill.routes.js
│   │   └── ai.routes.js
│   ├── scripts/
│   │   └── seed.js                # Idempotent demo data seeder
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── transaction.service.js
│   │   ├── dashboard.service.js
│   │   ├── budget.service.js
│   │   ├── bill.service.js
│   │   ├── ai.service.js
│   │   └── email.service.js       # Nodemailer (Phase 17)
│   ├── utils/
│   │   └── calculateBalance.js
│   ├── app.js                     # Express app (routes, middleware)
│   ├── server.js                  # Entry point (DB connect + listen)
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   │   └── axiosClient.js     # Axios + silent refresh interceptor
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   └── Layout.jsx     # Sidebar + navbar + dark mode
│   │   │   └── ui/
│   │   │       └── Toast.jsx      # Toast notification system
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   ├── hooks/
│   │   │   └── useToast.js        # Re-exports useToast from Toast.jsx
│   │   ├── pages/
│   │   │   ├── Auth/
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   └── RegisterPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── TransactionsPage.jsx
│   │   │   ├── BudgetsPage.jsx
│   │   │   ├── BillsPage.jsx      # Includes email reminder toggle (P17)
│   │   │   ├── AIReportsPage.jsx
│   │   │   └── ChartsPage.jsx
│   │   ├── utils/
│   │   │   └── formatCurrency.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css              # .card, .input, .btn-* utilities
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── package.json
│   └── .env.example
│
├── .gitignore
└── README.md
```

---

## Environment Variables

### Backend — `backend/.env`

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | HTTP server port |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `MONGODB_URI` | **Yes** | — | MongoDB connection string |
| `JWT_SECRET` | **Yes** | — | Access token signing secret (≥ 32 chars) |
| `JWT_EXPIRES_IN` | No | `15m` | Access token lifetime |
| `REFRESH_TOKEN_SECRET` | **Yes** | — | Refresh token signing secret (≥ 32 chars) |
| `REFRESH_TOKEN_EXPIRES_IN` | No | `30d` | Refresh token lifetime |
| `CLIENT_URL` | No | `http://localhost:5173` | Frontend URL for CORS |
| `OPENAI_API_KEY` | No | — | OpenAI key (AI Reports feature) |
| `SMTP_HOST` | No | `smtp.gmail.com` | SMTP server host |
| `SMTP_PORT` | No | `587` | SMTP port (587 = STARTTLS, 465 = SSL) |
| `SMTP_USER` | No | — | SMTP username / email |
| `SMTP_PASS` | No | — | SMTP password or App Password |
| `SMTP_FROM` | No | `noreply@smartfinance.app` | From address in reminder emails |

### Frontend — `frontend/.env`

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | No | `http://localhost:5000/api/v1` | Backend API base URL |

---

## Local Installation

### Prerequisites

- Node.js ≥ 18
- MongoDB running locally **or** a MongoDB Atlas connection string

### 1. Clone the repo

```bash
git clone https://github.com/your-org/smartfinance-ai.git
cd smartfinance-ai
```

### 2. Set up the backend

```bash
cd backend
cp .env.example .env
# Edit .env — set MONGODB_URI, JWT_SECRET, REFRESH_TOKEN_SECRET at minimum
npm install
npm run dev          # Starts on http://localhost:5000
```

### 3. Set up the frontend

```bash
cd ../frontend
cp .env.example .env
# VITE_API_URL is pre-set to localhost:5000 — no changes needed for local dev
npm install
npm run dev          # Starts on http://localhost:5173
```

### 4. Open the app

Navigate to **http://localhost:5173** and register a new account.

---

## Seeding Sample Data

The seed script creates a demo user + 6 months of transactions, 7 budgets, and 3 bills. It is **idempotent** — safe to run multiple times.

```bash
cd backend
node scripts/seed.js
```

Default demo credentials:

| Field | Value |
|---|---|
| Email | `demo@smartfinance.app` |
| Password | `Demo1234!` |

---

## API Reference

All routes are prefixed with `/api/v1`.

### Auth

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Register → `{ accessToken, refreshToken, user }` |
| POST | `/auth/login` | No | Login → `{ accessToken, refreshToken, user }` |
| POST | `/auth/refresh` | No | Rotate refresh token → `{ accessToken, refreshToken }` |
| POST | `/auth/logout` | Bearer | Invalidate refresh token |
| GET | `/auth/me` | Bearer | Current user profile |

### Transactions

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/transactions` | Bearer | List (filter: type, category, dateFrom, dateTo, page, limit) |
| POST | `/transactions` | Bearer | Create transaction |
| PUT | `/transactions/:id` | Bearer | Update transaction |
| DELETE | `/transactions/:id` | Bearer | Delete transaction |
| GET | `/transactions/export` | Bearer | Export CSV or XLSX (`?format=csv` or `?format=xlsx`) |

### Dashboard

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/dashboard` | Bearer | Balance, monthly trend, budget summary, category breakdown |

### Budgets

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/budgets` | Bearer | List budgets (filter: `?month=YYYY-MM`) |
| POST | `/budgets` | Bearer | Create budget |
| PUT | `/budgets/:id` | Bearer | Update budget |
| DELETE | `/budgets/:id` | Bearer | Delete budget |

### Bills

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/bills` | Bearer | List all bills |
| POST | `/bills` | Bearer | Create bill |
| PUT | `/bills/:id` | Bearer | Update bill (including `isPaid` toggle) |
| DELETE | `/bills/:id` | Bearer | Delete bill |

### AI Reports

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/ai/report` | Bearer | Generate report (`type`: `spending_analysis`, `budget_review`, `financial_health`) |
| GET | `/ai/reports` | Bearer | List saved reports |
| GET | `/ai/reports/:id/pdf` | Bearer | Download report as PDF |

---

## Deployment Guide

### Backend on Railway

1. Push your repo to GitHub.
2. Create a new Railway project → **Deploy from GitHub**.
3. Set all environment variables from `.env.example` in Railway's **Variables** tab.
4. Railway auto-detects Node.js and runs `npm start`.
5. Copy the Railway URL (e.g. `https://smartfinance-api.up.railway.app`).

### Frontend on Vercel

1. Import the repo in Vercel → set **Root Directory** to `frontend`.
2. Add environment variable: `VITE_API_URL=https://your-railway-url/api/v1`
3. Deploy. Vercel auto-runs `npm run build`.

### MongoDB Atlas

1. Create a free M0 cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. Create a database user and whitelist `0.0.0.0/0` (or Railway's IP range).
3. Copy the connection string and set it as `MONGODB_URI` in Railway.

### Email (Gmail App Password)

1. Enable 2-Step Verification on your Google account.
2. Go to **myaccount.google.com/apppasswords** → create an app password.
3. Set `SMTP_USER=your@gmail.com` and `SMTP_PASS=<16-char app password>`.

### Email (Resend — recommended for production)

```
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_xxxxxxxxxxxxxxxxxxxx   # your Resend API key
SMTP_FROM=notifications@yourdomain.com
```

---

## Final Project Checklist

### Backend

- [x] **P1** — Auth: register / login / logout / me; User + Transaction models; JWT middleware; error handler
- [x] **P2** — Transaction CRUD; dashboard service (balance, trends, budgetSummary, categoryBreakdown)
- [x] **P3** — Budget / Bill / AI services, controllers, routes; GPT-4o-mini reports (3 types)
- [x] **P10** — Budget, Bill, AIReport models finalized; upgraded services; error handler improvements
- [x] **P11** — Budget alerts on transaction create; PDFKit AI report download; Toast notification system
- [x] **P13** — Rate limiting (global + auth); idempotent seed script; DEPLOY.md
- [x] **P14** — Refresh token rotation (SHA-256 hash stored, reuse detection, full invalidation)
- [x] **P15** — CSV + XLSX transaction export (`GET /transactions/export`)
- [x] **P16** — Full refresh token pair rotation on every `/auth/refresh` call
- [x] **P17** — Overdue bill email reminders (nodemailer + node-cron daily at 08:00)

### Frontend

- [x] **P4** — React scaffold: Vite, Tailwind, AuthContext, ThemeContext, axiosClient, routing
- [x] **P5** — LoginPage, RegisterPage
- [x] **P6** — Layout (sidebar + navbar + dark mode toggle), DashboardPage, formatCurrency
- [x] **P7** — TransactionsPage (CRUD, filters, pagination, grouped by month, budget alert toasts)
- [x] **P8** — BudgetsPage (month selector, progress bars), BillsPage (overdue/upcoming/paid groups)
- [x] **P9** — AIReportsPage (3 report types, markdown renderer, copy to clipboard, PDF download)
- [x] **P10** — ChartsPage (Recharts bar/pie charts)
- [x] **P12** — MonthlyTrendChart (AreaChart, last 6 months, dark mode)
- [x] **P14** — axiosClient silent refresh: queues 401s, rotates both tokens, forceLogout on failure
- [x] **P15** — ExportDropdown (CSV + XLSX blob download, spinner, toasts)
- [x] **P16** — axiosClient persists rotated refreshToken to localStorage after every refresh
- [x] **P17** — BillsPage email reminders toggle (Bell icon, pill switch, localStorage `sf_bill_reminders`)

### Design Tokens (consistent across all components)

| Token | Hex | Usage |
|---|---|---|
| `ai` | `#3b82f6` | AI features, primary actions, links |
| `income` | `#22c55e` | Positive balances, paid status |
| `expense` | `#ef4444` | Expenses, errors, delete actions |
| `warning` | `#f59e0b` | Budget alerts, upcoming bills |

### Security

- [x] Passwords hashed with bcrypt (salt rounds: 10)
- [x] Access tokens expire in 15 minutes
- [x] Refresh tokens stored as SHA-256 hash (never raw)
- [x] Refresh token rotation — reuse triggers full session invalidation
- [x] `helmet()` security headers on all responses
- [x] CORS restricted to `CLIENT_URL`
- [x] Global rate limit: 100 req/15 min per IP
- [x] Auth route rate limit: 10 req/15 min per IP
- [x] `trust proxy` set for accurate IP detection behind Railway/Render

### Known Limitations / Future Work

- Email reminder opt-in is client-side only (localStorage); a true per-user preference requires a `User.emailReminders` field
- No multi-currency support yet
- No PWA / offline support
- No savings goals feature yet (Phase 18 scope defined in PROJECT_MEMORY.md)
