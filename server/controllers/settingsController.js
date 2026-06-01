// Handles operational health checks and manually triggered Gmail API test emails.
const { checkDatabaseConnection } = require('../services/dataService');
const gmailApiEmailService = require('../services/gmailApiEmailService');
const { getSchedulerStatus } = require('../services/schedulerService');
const templateService = require('../services/templateService');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  try {
    await gmailApiEmailService.sendEmail({
      to: email,
      subject: 'Weekly Timesheet Reminder System test email',
      text: 'Your Gmail API settings are working. This is a manual test email from the Weekly Timesheet Reminder System.',
      html: '<p>Your Gmail API settings are working. This is a manual test email from the Weekly Timesheet Reminder System.</p>',
    });
    res.json({ message: `Test email sent to ${email}.` });
  } catch (error) {
    res.status(502).json({ error: `Gmail API test failed: ${error.message}` });
  }
}
async function getEmailTemplate(req, res, next) { try { const template = await templateService.getTemplate(); res.json({ template, preview: templateService.previewTemplate(template) }); } catch (error) { next(error); } }
async function updateEmailTemplate(req, res, next) {
  try { const result = await templateService.saveTemplate(req.body); if (result.errors.length) return res.status(400).json({ errors: result.errors, warnings: result.warnings }); res.json({ ...result, preview: templateService.previewTemplate(result.template) }); } catch (error) { next(error); }
}

module.exports = { getEmailTemplate, health, sendTestEmail, updateEmailTemplate };
