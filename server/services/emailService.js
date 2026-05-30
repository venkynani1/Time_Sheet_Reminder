// Sends free SMTP email reminders through Nodemailer.
const nodemailer = require('nodemailer');

const requiredEmailVariables = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM'];

function getMissingConfiguration() {
  return requiredEmailVariables.filter((name) => !process.env[name] || process.env[name].startsWith('MANUAL_UPDATE_REQUIRED'));
}

function getTransporter() {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
  const missing = getMissingConfiguration();
  if (missing.length) throw new Error(`SMTP configuration requires manual update: ${missing.join(', ')}.`);
  return nodemailer.createTransport({
    host: EMAIL_HOST, port: Number(EMAIL_PORT), secure: Number(EMAIL_PORT) === 465,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
}

async function sendTestEmail(to) {
  return getTransporter().sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Weekly Timesheet Reminder System test email',
    text: 'Your SMTP settings are working. This is a manual test email from the Weekly Timesheet Reminder System.',
  });
}

function escapeHtml(text) {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\n', '<br>');
}

async function sendReminder(member, content) {
  return getTransporter().sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: member.email,
    subject: content.subject,
    text: content.body,
    html: `<p>${escapeHtml(content.body)}</p>`,
  });
}

module.exports = { getMissingConfiguration, sendReminder, sendTestEmail };
