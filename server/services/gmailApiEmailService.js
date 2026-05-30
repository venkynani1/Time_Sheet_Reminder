// Sends email through the Gmail API over HTTPS with OAuth2 credentials.
const { google } = require('googleapis');

const REQUEST_TIMEOUT_MS = 15000;
const requiredVariables = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'GMAIL_SENDER_EMAIL'];

function getMissingConfiguration() {
  return requiredVariables.filter((name) => !process.env[name] || process.env[name].startsWith('MANUAL_UPDATE_REQUIRED'));
}

function sanitizeHeader(value) {
  return String(value).replace(/[\r\n]+/g, ' ').trim();
}

function encodeSubject(subject) {
  return `=?UTF-8?B?${Buffer.from(sanitizeHeader(subject), 'utf8').toString('base64')}?=`;
}

function buildRawMessage({ to, subject, html, text }) {
  const boundary = `timesheet-reminder-${Date.now()}`;
  const lines = [
    `From: ${sanitizeHeader(process.env.GMAIL_SENDER_EMAIL)}`,
    `To: ${sanitizeHeader(to)}`,
    `Subject: ${encodeSubject(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(text || '', 'utf8').toString('base64'),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(html || '', 'utf8').toString('base64'),
    `--${boundary}--`,
  ];
  return Buffer.from(lines.join('\r\n'), 'utf8').toString('base64url');
}

function getGmailClient() {
  const missingVars = getMissingConfiguration();
  if (missingVars.length) throw new Error(`Gmail API configuration requires: ${missingVars.join(', ')}.`);
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth });
}

async function sendEmail({ to, subject, html, text }) {
  const gmail = getGmailClient();
  const request = gmail.users.messages.send(
    { userId: 'me', requestBody: { raw: buildRawMessage({ to, subject, html, text }) } },
    { timeout: REQUEST_TIMEOUT_MS },
  );
  let timer;
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error('Gmail API request timed out after 15 seconds.')), REQUEST_TIMEOUT_MS);
    timer.unref?.();
  });
  try {
    const response = await Promise.race([request, timeout]);
    return { id: response.data.id, threadId: response.data.threadId };
  } catch (error) {
    throw new Error(error.message || 'Gmail API send failed.');
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { buildRawMessage, getMissingConfiguration, sendEmail };
