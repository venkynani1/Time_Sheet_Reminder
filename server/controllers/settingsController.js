// Handles operational health checks and manually triggered Gmail API test emails.
const { checkDatabaseConnection, prisma } = require('../services/dataService');
const gmailApiEmailService = require('../services/gmailApiEmailService');
const { getSchedulerStatus } = require('../services/schedulerService');
const templateService = require('../services/templateService');
const { getCycleForDate } = require('../services/weekService');
const whatsappService = require('../whatsappService');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value) {
  return String(value || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\n', '<br>');
}

function summarizeGmailResponse(response) {
  return `Gmail API accepted message id ${response.id || 'unknown'} in thread ${response.threadId || 'unknown'}.`;
}

function logEmailDelivery({ recipientEmail, subject, gmailMessageId, gmailThreadId, status, error }) {
  console.log(JSON.stringify({
    channel: 'EMAIL',
    recipient: recipientEmail,
    subject,
    gmailMessageId,
    gmailThreadId,
    status,
    error: error || null,
  }));
}

async function dbHealth(req, res) {
  try {
    await checkDatabaseConnection();
    res.json({ status: 'ok', database: { configured: true, accessible: true, error: null } });
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      database: { configured: Boolean(process.env.DATABASE_URL), accessible: false, error: error.message },
    });
  }
}

async function health(req, res) {
  const missingVars = gmailApiEmailService.getMissingConfiguration();
  let storageAccessible = true;
  let storageError = null;
  try {
    await checkDatabaseConnection();
  } catch (error) {
    storageAccessible = false;
    storageError = error.message;
  }
  const scheduler = getSchedulerStatus();
  const healthy = storageAccessible && scheduler.running;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    emailProvider: 'gmail-api',
    configured: missingVars.length === 0,
    missingVars,
    scheduler,
    storage: { accessible: storageAccessible, error: storageError },
  });
}

async function sendTestEmail(req, res) {
  const { email } = req.body;
  if (!emailPattern.test(email || '')) return res.status(400).json({ error: 'Enter a valid test email address.' });
  const missingVars = gmailApiEmailService.getMissingConfiguration();
  if (missingVars.length) {
    return res.status(400).json({ error: `Update ${missingVars.join(', ')} before sending a test email.` });
  }
  const subject = 'Weekly Timesheet Reminder System test email';
  const text = 'Your Gmail API settings are working. This is a manual test email from the Weekly Timesheet Reminder System.';
  let gmailResponse = null;
  try {
    gmailResponse = await gmailApiEmailService.sendEmail({
      to: email,
      subject,
      text,
      html: `<p>${text}</p>`,
    });
    logEmailDelivery({ recipientEmail: email, subject, gmailMessageId: gmailResponse.id, gmailThreadId: gmailResponse.threadId, status: 'SENT' });
    await prisma.reminderLog.create({ data: { memberId: null, channel: 'EMAIL', message: text, status: 'SENT', error: null, gmailMessageId: gmailResponse.id, gmailThreadId: gmailResponse.threadId, recipientEmail: email, subject, providerResponseSummary: summarizeGmailResponse(gmailResponse) } });
    res.json({ message: `Test email sent to ${email}.` });
  } catch (error) {
    logEmailDelivery({ recipientEmail: email, subject, status: 'FAILED', error: error.message });
    await prisma.reminderLog.create({ data: { memberId: null, channel: 'EMAIL', message: text, status: 'FAILED', error: error.message, recipientEmail: email, subject } });
    res.status(502).json({ error: `Gmail API test failed: ${error.message}` });
  }
}
async function sendReminderTemplateTest(req, res) {
  const { email } = req.body;
  if (!emailPattern.test(email || '')) return res.status(400).json({ error: 'Enter a valid test email address.' });
  const missingVars = gmailApiEmailService.getMissingConfiguration();
  if (missingVars.length) return res.status(400).json({ error: `Update ${missingVars.join(', ')} before sending a reminder template test.` });

  const cycle = getCycleForDate();
  const template = await templateService.getTemplate();
  const confirmationLink = `${(process.env.APP_BASE_URL || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '')}/confirm/email-diagnostics-test`;
  const content = templateService.renderTemplate(template, {
    name: 'Test User',
    confirmationLink,
    deadline: 'Monday 9:00 AM',
    weekRange: `${cycle.weekStartDate} to ${cycle.weekEndDate}`,
  });
  let status = 'SENT';
  let error = null;
  let gmailResponse = null;

  try {
    gmailResponse = await gmailApiEmailService.sendEmail({
      to: email,
      subject: content.subject,
      text: content.body,
      html: `<p>${escapeHtml(content.body)}</p>`,
    });
  } catch (sendError) {
    status = 'FAILED';
    error = sendError.message;
  }

  logEmailDelivery({ recipientEmail: email, subject: content.subject, gmailMessageId: gmailResponse?.id, gmailThreadId: gmailResponse?.threadId, status, error });
  await prisma.reminderLog.create({
    data: {
      memberId: null,
      channel: 'EMAIL',
      message: content.body,
      status,
      error,
      gmailMessageId: gmailResponse?.id || null,
      gmailThreadId: gmailResponse?.threadId || null,
      recipientEmail: email,
      subject: content.subject,
      providerResponseSummary: gmailResponse ? summarizeGmailResponse(gmailResponse) : null,
    },
  });

  if (status === 'FAILED') return res.status(502).json({ error: `Reminder template test failed: ${error}` });
  return res.json({ message: `Same reminder template test sent to ${email}.`, gmailMessageId: gmailResponse.id, gmailThreadId: gmailResponse.threadId });
}

async function emailDiagnostics(req, res, next) {
  try {
    const logs = await prisma.reminderLog.findMany({ where: { channel: 'EMAIL' }, orderBy: { sentAt: 'desc' }, take: 50 });
    const memberIds = [...new Set(logs.map((log) => log.memberId).filter(Boolean))];
    const members = memberIds.length ? await prisma.member.findMany({ where: { id: { in: memberIds } }, select: { id: true, name: true, email: true } }) : [];
    const membersById = new Map(members.map((member) => [member.id, member]));
    res.json(logs.map((log) => {
      const member = membersById.get(log.memberId);
      return {
        sentAt: log.sentAt,
        memberName: member?.name || null,
        recipientEmail: log.recipientEmail || member?.email || null,
        subject: log.subject,
        status: log.status,
        error: log.error,
        gmailMessageId: log.gmailMessageId,
        gmailThreadId: log.gmailThreadId,
      };
    }));
  } catch (error) {
    next(error);
  }
}
async function whatsappStatus(req, res) { res.json(whatsappService.getStatus()); }
async function getEmailTemplate(req, res, next) { try { const template = await templateService.getTemplate(); res.json({ template, preview: templateService.previewTemplate(template) }); } catch (error) { next(error); } }
async function updateEmailTemplate(req, res, next) {
  try { const result = await templateService.saveTemplate(req.body); if (result.errors.length) return res.status(400).json({ errors: result.errors, warnings: result.warnings }); res.json({ ...result, preview: templateService.previewTemplate(result.template) }); } catch (error) { next(error); }
}

module.exports = { dbHealth, emailDiagnostics, getEmailTemplate, health, sendReminderTemplateTest, sendTestEmail, updateEmailTemplate, whatsappStatus };
