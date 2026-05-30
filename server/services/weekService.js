// Calculates the Friday-to-Monday reminder window using Asia/Kolkata time.
const TIMEZONE = process.env.TIMEZONE || 'Asia/Kolkata';

function getIndiaParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
}

function dateOnly(date) {
  const parts = getIndiaParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function shiftDate(dateString, days) {
  const date = new Date(`${dateString}T12:00:00+05:30`);
  date.setUTCDate(date.getUTCDate() + days);
  return dateOnly(date);
}

function getCycleForDate(date = new Date()) {
  const parts = getIndiaParts(date);
  const weekdayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  const daysSinceFriday = (weekdayIndex - 5 + 7) % 7;
  const friday = shiftDate(dateOnly(date), -daysSinceFriday);
  return { weekStartDate: friday, weekEndDate: shiftDate(friday, 3) };
}

function getWindowState(date = new Date()) {
  const parts = getIndiaParts(date);
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  const isFriday = parts.weekday === 'Fri' && minutes >= 17 * 60;
  const isSaturdayOrSunday = ['Sat', 'Sun'].includes(parts.weekday);
  const isMonday = parts.weekday === 'Mon' && minutes < 9 * 60;
  return {
    active: isFriday || isSaturdayOrSunday || isMonday,
    urgent: parts.weekday === 'Mon' && minutes >= 7 * 60 && minutes < 9 * 60,
    label: isFriday || isSaturdayOrSunday || isMonday ? 'Active' : 'Closed',
  };
}

function formatIndiaDateTime(date = new Date()) {
  return new Intl.DateTimeFormat('en-IN', { timeZone: TIMEZONE, dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

module.exports = { TIMEZONE, formatIndiaDateTime, getCycleForDate, getIndiaParts, getWindowState };
