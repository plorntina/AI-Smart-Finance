// backend/services/email.service.js  —  Phase 17
// Sends overdue bill reminder emails via nodemailer.
"use strict";

const nodemailer = require("nodemailer");
const env        = require("../config/env");

// ─── Transporter ─────────────────────────────────────────────────────────────

function createTransporter() {
  return nodemailer.createTransport({
    host:   env.SMTP_HOST,
    port:   Number(env.SMTP_PORT) || 587,
    secure: Number(env.SMTP_PORT) === 465, // true for port 465, false for others
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

// ─── HTML template ───────────────────────────────────────────────────────────

function buildHtml(userName, bills) {
  const rows = bills
    .map((b) => {
      const due      = new Date(b.nextDueDate);
      const today    = new Date();
      today.setHours(0, 0, 0, 0);
      const diffMs   = today - due;
      const daysOver = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      const amount   = new Intl.NumberFormat("id-ID", {
        style: "currency", currency: "IDR", maximumFractionDigits: 0,
      }).format(b.amount);

      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #2d2d3a;color:#f1f5f9;">${b.name}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #2d2d3a;color:#22c55e;font-weight:600;">${amount}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #2d2d3a;color:#ef4444;">${daysOver} day${daysOver !== 1 ? "s" : ""} overdue</td>
        </tr>`;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:12px;overflow:hidden;border:1px solid #2d2d3a;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#3b82f6,#6366f1);padding:28px 32px;">
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:2px;color:#bfdbfe;text-transform:uppercase;">SmartFinance AI</p>
            <h1 style="margin:8px 0 0;font-size:22px;color:#ffffff;font-weight:700;">Overdue Bill Reminder</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 20px;font-size:15px;color:#94a3b8;">
              Hi <strong style="color:#f1f5f9;">${userName}</strong>,
            </p>
            <p style="margin:0 0 24px;font-size:14px;color:#94a3b8;line-height:1.6;">
              You have <strong style="color:#ef4444;">${bills.length} overdue bill${bills.length !== 1 ? "s" : ""}</strong>
              that require your attention. Please settle them as soon as possible to avoid late fees.
            </p>

            <!-- Bills table -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #2d2d3a;">
              <thead>
                <tr style="background:#0f0f1a;">
                  <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;letter-spacing:1px;color:#64748b;text-transform:uppercase;">Bill</th>
                  <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;letter-spacing:1px;color:#64748b;text-transform:uppercase;">Amount</th>
                  <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;letter-spacing:1px;color:#64748b;text-transform:uppercase;">Status</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>

            <p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.6;">
              Log in to <a href="#" style="color:#3b82f6;text-decoration:none;">SmartFinance AI</a>
              to mark bills as paid and keep your finances on track.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #2d2d3a;">
            <p style="margin:0;font-size:11px;color:#475569;text-align:center;">
              You are receiving this because you have an active SmartFinance AI account.<br>
              This is an automated reminder sent daily at 08:00.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send overdue bill reminder email.
 * @param {string}   to       - Recipient email address
 * @param {string}   userName - Recipient display name
 * @param {object[]} bills    - Array of Bill documents (name, amount, nextDueDate)
 */
async function sendOverdueBillReminder(to, userName, bills) {
  const transporter = createTransporter();
  const html = buildHtml(userName, bills);

  await transporter.sendMail({
    from:    `"SmartFinance AI" <${env.SMTP_FROM}>`,
    to,
    subject: `⚠️ You have ${bills.length} overdue bill${bills.length !== 1 ? "s" : ""} — SmartFinance AI`,
    html,
    // Plain-text fallback
    text: `Hi ${userName},\n\nYou have ${bills.length} overdue bill(s):\n\n` +
          bills.map((b) => `• ${b.name} — ${b.amount}`).join("\n") +
          `\n\nPlease log in to SmartFinance AI to settle them.\n`,
  });
}

module.exports = { sendOverdueBillReminder };
