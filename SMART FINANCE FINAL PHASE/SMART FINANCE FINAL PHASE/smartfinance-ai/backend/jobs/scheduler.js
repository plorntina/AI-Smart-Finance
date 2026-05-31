// backend/jobs/scheduler.js  —  Phase 17
// Registers all cron jobs. Call startScheduler() once after DB connects.
"use strict";

const cron                  = require("node-cron");
const { runBillReminderJob } = require("./billReminder.job");

/**
 * Start all scheduled background jobs.
 * Call this once from server.js after the MongoDB connection resolves.
 */
function startScheduler() {
  // ── Bill Reminder: daily at 08:00 server local time ──────────────────────
  cron.schedule("0 8 * * *", async () => {
    try {
      await runBillReminderJob();
    } catch (err) {
      // Safety net — cron task should never crash the process
      console.error("[Scheduler] Uncaught error in runBillReminderJob:", err);
    }
  });

  console.log("[Scheduler] Bill reminder job scheduled — runs daily at 08:00.");
}

module.exports = { startScheduler };
