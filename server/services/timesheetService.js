// Owns weekly resets, confirmation state, and guarded reminder delivery.
const { prisma } = require('./dataService');
const gmailApiEmailService = require('./gmailApiEmailService');
const templateService = require('./templateService');
const telegramService = require('./telegramService');
const { getCycleForDate, getWindowState } = require('./weekService');

function buildConfirmationLink(memberToken) {
  if (!process.env.APP_BASE_URL) throw new Error('APP_BASE_URL must be configured with the public Vercel frontend URL.');
  return `${process.env.APP_BASE_URL.replace(/\/$/, '')}/confirm/${memberToken}`;
}

async function resetWeek(date = new Date()) {
  const cycle = getCycleForDate(date);
  return prisma.$transaction(async (transaction) => {
    await transaction.weeklyStatus.deleteMany({ where: { weekStartDate: cycle.weekStartDate } });
    const members = await transaction.member.findMany({ where: { active: true }, select: { id: true } });
    if (members.length) await transaction.weeklyStatus.createMany({ data: members.map((member) => ({ ...cycle, memberId: member.id })) });
    return transaction.weeklyStatus.findMany({ where: { weekStartDate: cycle.weekStartDate } });
  });
}

async function addMemberToCurrentCycle(memberId, date = new Date()) {
  const cycle = getCycleForDate(date);
  const cycleExists = await prisma.weeklyStatus.findFirst({ where: { weekStartDate: cycle.weekStartDate }, select: { id: true } });
  if (!cycleExists) return null;
  return prisma.weeklyStatus.upsert({
    where: { weekStartDate_memberId: { weekStartDate: cycle.weekStartDate, memberId } },
    update: {},
    create: { ...cycle, memberId },
  });
}

async function getCurrentWeek(date = new Date()) {
  const cycle = getCycleForDate(date);
  const statuses = await prisma.weeklyStatus.findMany({
    where: { weekStartDate: cycle.weekStartDate },
    include: { member: true },
  });
  return { ...cycle, window: getWindowState(date), statuses };
}

async function markSubmitted(memberId, date = new Date()) {
  const cycle = getCycleForDate(date);
  const existing = await prisma.weeklyStatus.findUnique({ where: { weekStartDate_memberId: { weekStartDate: cycle.weekStartDate, memberId } } });
  if (!existing) return null;
  return prisma.weeklyStatus.update({
    where: { id: existing.id },
    data: { status: 'SUBMITTED', submittedAt: existing.submittedAt || new Date() },
  });
}

async function confirmByToken(token, answer) {
  const member = await prisma.member.findFirst({ where: { token, active: true } });
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
      await prisma.reminderLog.create({ data: { memberId: item.memberId, channel: channel.name, message: content.body, status, error } });
      results.push({ memberId: item.memberId, channel: channel.name, status, error });
    }
    if (selectedChannels.length) {
      await prisma.weeklyStatus.update({ where: { id: item.id }, data: { lastReminderSentAt: new Date(), reminderCount: { increment: 1 } } });
    }
  }
  return results;
}

async function getLogs() {
  const logs = await prisma.reminderLog.findMany({ orderBy: { sentAt: 'desc' } });
  const members = await prisma.member.findMany({ where: { id: { in: logs.map((log) => log.memberId) } } });
  const membersById = new Map(members.map((member) => [member.id, member]));
  return logs.map((log) => ({ ...log, member: membersById.get(log.memberId) }));
}

module.exports = { addMemberToCurrentCycle, buildConfirmationLink, confirmByToken, getCurrentWeek, getLogs, markSubmitted, resetWeek, sendReminders };
