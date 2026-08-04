// services/emailService.js
//
// One place all outbound email goes through. If SMTP_HOST/SMTP_USER/
// SMTP_PASS aren't set in .env, this falls back to just logging the email
// to the console clearly marked as "NOT SENT" - so the feature works and is
// testable in dev without real email credentials, and is a one-env-var
// change away from actually sending mail once you have an SMTP provider
// (Gmail, SendGrid, Mailgun, etc. all work with nodemailer).

const nodemailer = require('nodemailer');

let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  console.log('[email] SMTP configured - real emails will be sent');
} else {
  console.warn('[email] SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing from .env) - emails will be logged, not sent');
}

async function sendEmail({ to, subject, text, html }) {
  if (!to) {
    console.warn('[email] skipped - no recipient address provided');
    return { sent: false, reason: 'no recipient' };
  }

  if (!transporter) {
    console.log('--- EMAIL NOT SENT (SMTP not configured) ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    console.log('---------------------------------------------');
    return { sent: false, reason: 'SMTP not configured', logged: true };
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to, subject, text, html: html || undefined,
    });
    console.log(`[email] ✓ sent to ${to}: "${subject}"`);
    return { sent: true };
  } catch (err) {
    console.error(`[email] ✗ failed to send to ${to}:`, err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendEmail };
