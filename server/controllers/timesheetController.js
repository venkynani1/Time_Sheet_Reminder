// Handles weekly status, confirmation, manual reminder, and log requests.
const timesheetService = require('../services/timesheetService');

async function current(req, res, next) { try { res.json(await timesheetService.getCurrentWeek()); } catch (error) { next(error); } }
async function confirm(req, res, next) { try { const result = await timesheetService.confirmByToken(req.params.token, req.body.answer); result ? res.json(result) : res.status(404).json({ error: 'Confirmation link is invalid.' }); } catch (error) { next(error); } }
async function sendNow(req, res) { try { const results = await timesheetService.sendReminders({ ignoreWindow: true, source: 'manual' }); res.json({ message: 'Reminder run completed.', results }); } catch (error) { res.status(400).json({ error: error.message }); } }
async function reset(req, res, next) { try { res.json({ statuses: await timesheetService.resetWeek() }); } catch (error) { next(error); } }
async function mark(req, res, next) { try { const status = await timesheetService.markSubmitted(req.params.memberId); status ? res.json(status) : res.status(404).json({ error: 'Current-week member status not found.' }); } catch (error) { next(error); } }
async function logs(req, res, next) { try { res.json(await timesheetService.getLogs()); } catch (error) { next(error); } }
async function settings(req, res) { res.json({ timezone: process.env.TIMEZONE || 'Asia/Kolkata', emailEnabled: process.env.EMAIL_ENABLED !== 'false', telegramEnabled: process.env.TELEGRAM_ENABLED === 'true', whatsappEnabled: process.env.WHATSAPP_ENABLED === 'true', twilioEnabled: process.env.TWILIO_ENABLED === 'true' }); }

module.exports = { confirm, current, logs, mark, reset, sendNow, settings };
