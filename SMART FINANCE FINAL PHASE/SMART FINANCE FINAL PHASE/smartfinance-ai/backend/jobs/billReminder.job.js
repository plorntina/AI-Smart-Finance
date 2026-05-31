// backend/jobs/billReminder.job.js  —  Phase 17
// Standalone async function; called by the scheduler every morning at 08:00.
"use strict";

const Bill                    = require("../models/Bill");
const User                    = require("../models/User");
const { sendOverdueBillReminder } = require("../services/email.service");

/**
 * Finds all unpaid bills whose nextDueDate is before today,
 * groups them by userId, and emails each affected user.
 */
async function runBillReminderJob() {
  const jobStart = new Date();
  console.log(`[BillReminder] Job started at ${jobStart.toISOString()}`);

  // Midnight today (server local time)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let overdueBills;
  try {
    overdueBills = await Bill.find({
      isPaid:      false,
      nextDueDate: { $lt: today },
    }).lean();
  } catch (err) {
    console.error("[BillReminder] DB query failed:", err.message);
    return;
  }

  if (overdueBills.length === 0) {
    console.log("[BillReminder] No overdue bills found. Job done.");
    return;
  }

  // Group bills by userId (string key)
  const byUser = overdueBills.reduce((acc, bill) => {
    const key = bill.userId.toString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(bill);
    return acc;
  }, {});

  const userIds  = Object.keys(byUser);
  let emailsSent = 0;
  let errors     = 0;

  for (const userId of userIds) {
    let user;
    try {
      user = await User.findById(userId).select("name email").lean();
    } catch (err) {
      console.error(`[BillReminder] Could not fetch user ${userId}:`, err.message);
      errors++;
      continue;
    }

    if (!user || !user.email) {
      console.warn(`[BillReminder] Skipping userId ${userId} — no email found.`);
      continue;
    }

    const bills = byUser[userId];
    try {
      await sendOverdueBillReminder(user.email, user.name, bills);
      console.log(
        `[BillReminder] ✓ Sent reminder to ${user.email} (${bills.length} bill${bills.length !== 1 ? "s" : ""})`
      );
      emailsSent++;
    } catch (err) {
      console.error(
        `[BillReminder] ✗ Failed to email ${user.email}:`,
        err.message
      );
      errors++;
    }
  }

  const elapsed = ((Date.now() - jobStart) / 1000).toFixed(2);
  console.log(
    `[BillReminder] Job complete — ${emailsSent} email(s) sent, ${errors} error(s). (${elapsed}s)`
  );
}

module.exports = { runBillReminderJob };
