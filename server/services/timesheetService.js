// Owns weekly resets, confirmation state, and guarded reminder delivery.
const { randomUUID } = require('crypto');
const { getDatabase, updateDatabase } = require('./dataService');
const gmailApiEmailService = require('./gmailApiEmailService');
const templateService = require('./templateService');
const telegramService = require('./telegramService');
const { getCycleForDate, getWindowState } = require('./weekService');

function buildStatus(memberId, cycle) {
  return { id: randomUUID(), ...cycle, memberId, status: 'PENDING', submittedAt: null, lastReminderSentAt: null, reminderCount: 0 };
}

function buildConfirmationLink(memberToken) {
  if (!process.env.APP_BASE_URL) throw new Error('APP_BASE_URL must be configured with the public Vercel frontend URL.');
  return `${process.env.APP_BASE_URL.replace(/\/$/, '')}/confirm/${memberToken}`;
}

async function resetWeek(date = new Date()) {
  const cycle = getCycleForDate(date);
  return updateDatabase((database) => {
    database.weeklyStatuses = database.weeklyStatuses.filter((status) => status.weekStartDate !== cycle.weekStartDate);
    const statuses = database.members.filter((member) => member.active).map((member) => buildStatus(member.id, cycle));
    database.weeklyStatuses.push(...statuses);
    return statuses;
  });
}

async function addMemberToCurrentCycle(memberId, date = new Date()) {
  const cycle = getCycleForDate(date);
  return updateDatabase((database) => {
    const cycleExists = database.weeklyStatuses.some((status) => status.weekStartDate === cycle.weekStartDate);
    if (!cycleExists) return null;
    const existing = database.weeklyStatuses.find((status) => status.weekStartDate === cycle.weekStartDate && status.memberId === memberId);
    if (existing) return existing;
    const status = buildStatus(memberId, cycle);
    database.weeklyStatuses.push(status);
    return status;
  });
}

async function getCurrentWeek(date = new Date()) {
  const cycle = getCycleForDate(date);
  const database = await getDatabase();
  const statuses = database.weeklyStatuses.filter((status) => status.weekStartDate === cycle.weekStartDate);
  const rows = statuses.map((status) => ({ ...status, member: database.members.find((member) => member.id === status.memberId) })).filter((row) => row.member);
  return { ...cycle, window: getWindowState(date), statuses: rows };
}

async function markSubmitted(memberId, date = new Date()) {
  const cycle = getCycleForDate(date);
  return updateDatabase((database) => {
    const status = database.weeklyStatuses.find((item) => item.weekStartDate === cycle.weekStartDate && item.memberId === memberId);
    if (!status) return null;
    status.status = 'SUBMITTED';
    status.submittedAt = status.submittedAt || new Date().toISOString();
    return status;
  });
}

async function confirmByToken(token, answer) {
  const database = await getDatabase();
  const member = database.members.find((item) => item.token === token && item.active);
  if (!member) return null;
  if (answer === 'YES') await markSubmitted(member.id);
  return { member, status: (await getCurrentWeek()).statuses.find((item) => item.memberId === member.id) || null };
}

async function sendReminders({ ignoreWindow = false, date = new Date() } = {}) {
  if (!ignoreWindow && !getWindowState(date).active) throw new Error('Reminder window is closed. No reminders were sent.');
  const current = await getCurrentWeek(date);
  const pending = current.statuses.filter((item) => item.status === 'PENDING' && item.member.active);
  const template = await templateService.getTemplate();
  const results = [];
  for (const item of pending) {
    const confirmationUrl = buildConfirmationLink(item.member.token);
    console.log('Confirmation link generated:', confirmationUrl);
    const content = templateService.renderTemplate(template, { name: item.member.name, confirmationLink: confirmationUrl, deadline: 'Monday 9:00 AM', weekRange: `${item.weekStartDate} to ${item.weekEndDate}` });
    const channels = [{ name: 'EMAIL', enabled: process.env.EMAIL_ENABLED !== 'false', ready: true, send: () => gmailApiEmailService.sendEmail({ to: item.member.email, subject: content.subject, text: content.body, html: `<p>${content.body.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\n', '<br>')}</p>` }) }];
    channels.push({ name: 'TELEGRAM', enabled: process.env.TELEGRAM_ENABLED === 'true', ready: Boolean(item.member.telegramChatId), send: () => telegramService.sendReminder(item.member, content.body, confirmationUrl) });
    const selectedChannels = channels.filter((entry) => entry.enabled && entry.ready);
    for (const channel of selectedChannels) {
      let status = 'SENT'; let error = null;
      try { await channel.send(); } catch (sendError) { status = 'FAILED'; error = sendError.message; }
      await updateDatabase((database) => database.reminderLogs.unshift({
        id: randomUUID(), memberId: item.memberId, channel: channel.name, message: content.body, status, sentAt: new Date().toISOString(), error,
      }));
      results.push({ memberId: item.memberId, channel: channel.name, status, error });
    }
    if (selectedChannels.length) {
      await updateDatabase((database) => {
        const status = database.weeklyStatuses.find((entry) => entry.id === item.id);
        if (status) { status.lastReminderSentAt = new Date().toISOString(); status.reminderCount += 1; }
      });
    }
  }
  return results;
}

async function getLogs() {
  const database = await getDatabase();
  return database.reminderLogs.map((log) => ({ ...log, member: database.members.find((member) => member.id === log.memberId) }));
}

module.exports = { addMemberToCurrentCycle, buildConfirmationLink, confirmByToken, getCurrentWeek, getLogs, markSubmitted, resetWeek, sendReminders };
