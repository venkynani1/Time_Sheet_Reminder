// Registers India-time cron jobs for resets and pending-member reminders.
const cron = require('node-cron');
const timesheetService = require('./timesheetService');

const options = { timezone: process.env.TIMEZONE || 'Asia/Kolkata' };
const run = (task) => task().catch((error) => console.error(`Scheduler: ${error.message}`));
let tasks = [];

function startScheduler() {
  if (tasks.length) return tasks;
  tasks = [
    cron.schedule('0 17 * * 5', () => run(async () => { await timesheetService.resetWeek(); await timesheetService.sendReminders(); }), options),
    cron.schedule('0 22 * * 5', () => run(() => timesheetService.sendReminders()), options),
    cron.schedule('0 3,8,13,18,23 * * 6', () => run(() => timesheetService.sendReminders()), options),
    cron.schedule('0 4,9,14,19 * * 0', () => run(() => timesheetService.sendReminders()), options),
    cron.schedule('0 0,5 * * 1', () => run(() => timesheetService.sendReminders()), options),
    cron.schedule('0,30 7-8 * * 1', () => run(() => timesheetService.sendReminders()), options),
  ];
  return tasks;
}

function getSchedulerStatus() {
  return { running: tasks.length > 0, taskCount: tasks.length, timezone: options.timezone };
}

module.exports = { getSchedulerStatus, startScheduler };
