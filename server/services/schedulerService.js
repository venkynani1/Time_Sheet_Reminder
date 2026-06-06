// Registers India-time cron jobs for resets and pending-member reminders.
const cron = require('node-cron');
const timesheetService = require('./timesheetService');
const { formatIndiaDateTime } = require('./weekService');

const options = { timezone: process.env.TIMEZONE || 'Asia/Kolkata' };
const run = (label, task) => {
  console.log(`Scheduler automatic run started: ${label} at ${formatIndiaDateTime()} (${options.timezone}).`);
  return task().catch((error) => console.error(`Scheduler automatic run failed: ${label} - ${error.message}`));
};
let tasks = [];

function startScheduler() {
  if (tasks.length) return tasks;
  // Simulation checkpoints for Asia/Kolkata:
  // Friday 5:00 PM: reset current week and send first reminder.
  // Friday 10:00 PM, Saturday, Sunday, Monday 12:00 AM/5:00 AM: send every 5 hours while pending.
  // Monday 7:00 AM and 8:30 AM: urgent window sends every 30 minutes while pending.
  // Monday 9:01 AM: no automatic cron exists and the window is closed.
  tasks = [
    cron.schedule('0 17 * * 5', () => run('Friday 5:00 PM first reminder', async () => { await timesheetService.resetWeek(); await timesheetService.sendReminders({ source: 'automatic' }); }), options),
    cron.schedule('0 22 * * 5', () => run('Friday 10:00 PM five-hour reminder', () => timesheetService.sendReminders({ source: 'automatic' })), options),
    cron.schedule('0 3,8,13,18,23 * * 6', () => run('Saturday five-hour reminder', () => timesheetService.sendReminders({ source: 'automatic' })), options),
    cron.schedule('0 4,9,14,19 * * 0', () => run('Sunday five-hour reminder', () => timesheetService.sendReminders({ source: 'automatic' })), options),
    cron.schedule('0 0,5 * * 1', () => run('Monday pre-7:00 AM five-hour reminder', () => timesheetService.sendReminders({ source: 'automatic' })), options),
    cron.schedule('0,30 7-8 * * 1', () => run('Monday 7:00-9:00 AM thirty-minute reminder', () => timesheetService.sendReminders({ source: 'automatic' })), options),
  ];
  return tasks;
}

function getSchedulerStatus() {
  return { running: tasks.length > 0, taskCount: tasks.length, timezone: options.timezone };
}

module.exports = { getSchedulerStatus, startScheduler };
