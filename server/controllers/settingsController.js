// Handles operational health checks and manually triggered SMTP test emails.
const { getDatabase } = require('../services/dataService');
const emailService = require('../services/emailService');
const { getSchedulerStatus } = require('../services/schedulerService');
const templateService = require('../services/templateService');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function health(req, res) {
  const missingConfiguration = emailService.getMissingConfiguration();
  let storageAccessible = true;
  let storageError = null;
  try {
    await getDatabase();
  } catch (error) {
    storageAccessible = false;
    storageError = error.message;
  }
  const scheduler = getSchedulerStatus();
  const healthy = storageAccessible && scheduler.running;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    smtp: { configured: missingConfiguration.length === 0, missingConfiguration },
    scheduler,
    storage: { accessible: storageAccessible, error: storageError },
  });
}

async function sendTestEmail(req, res) {
  const { email } = req.body;
  if (!emailPattern.test(email || '')) return res.status(400).json({ error: 'Enter a valid test email address.' });
  const missingConfiguration = emailService.getMissingConfiguration();
  if (missingConfiguration.length) {
    return res.status(400).json({ error: `Update ${missingConfiguration.join(', ')} in server/.env before sending a test email.` });
  }
  try {
    await emailService.sendTestEmail(email);
    res.json({ message: `Test email sent to ${email}.` });
  } catch (error) {
    res.status(502).json({ error: `SMTP test failed: ${error.message}` });
  }
}
async function getEmailTemplate(req, res, next) { try { const template = await templateService.getTemplate(); res.json({ template, preview: templateService.previewTemplate(template) }); } catch (error) { next(error); } }
async function updateEmailTemplate(req, res, next) {
  try { const result = await templateService.saveTemplate(req.body); if (result.errors.length) return res.status(400).json({ errors: result.errors, warnings: result.warnings }); res.json({ ...result, preview: templateService.previewTemplate(result.template) }); } catch (error) { next(error); }
}

module.exports = { getEmailTemplate, health, sendTestEmail, updateEmailTemplate };
