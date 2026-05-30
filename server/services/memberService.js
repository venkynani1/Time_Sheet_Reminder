// Manages saved team members and their stable confirmation tokens.
const { randomUUID } = require('crypto');
const { getDatabase, updateDatabase } = require('./dataService');
const timesheetService = require('./timesheetService');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateMember(input) {
  if (!input.name?.trim()) return 'Name is required.';
  if (!emailPattern.test(input.email || '')) return 'A valid email is required.';
  return null;
}

async function addMember(input) {
  const database = await getDatabase();
  if (database.members.some((member) => member.email.toLowerCase() === input.email.trim().toLowerCase())) throw new Error('A team member with this email already exists.');
  const member = {
    id: randomUUID(), name: input.name.trim(), email: input.email.trim(),
    mobile: input.mobile?.trim() || '', telegramChatId: input.telegramChatId?.trim() || '',
    token: randomUUID(), active: input.active !== false,
  };
  await updateDatabase((database) => database.members.push(member));
  await timesheetService.addMemberToCurrentCycle(member.id);
  return member;
}

async function updateMember(id, input) {
  return updateDatabase((database) => {
    const member = database.members.find((item) => item.id === id);
    if (!member) return null;
    if (database.members.some((item) => item.id !== id && item.email.toLowerCase() === input.email.trim().toLowerCase())) throw new Error('A team member with this email already exists.');
    Object.assign(member, {
      name: input.name.trim(), email: input.email.trim(), mobile: input.mobile?.trim() || '',
      telegramChatId: input.telegramChatId?.trim() || '', active: input.active !== false,
    });
    return member;
  });
}

async function deleteMember(id) {
  return updateDatabase((database) => {
    const index = database.members.findIndex((member) => member.id === id);
    if (index === -1) return false;
    database.members.splice(index, 1);
    return true;
  });
}

function parseCsvLine(line) {
  const values = []; let value = ''; let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) { values.push(value.trim()); value = ''; }
    else value += character;
  }
  values.push(value.trim());
  return values;
}

async function importCsv(csv) {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) throw new Error('CSV file is empty.');
  const headers = parseCsvLine(lines.shift()).map((header) => header.toLowerCase());
  if (!['name', 'email', 'mobile'].every((header) => headers.includes(header))) throw new Error('CSV headers must include name,email,mobile.');
  const rows = lines.map((line) => {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
    const error = validateMember(row);
    if (error) throw new Error(`${error} Check CSV row for ${row.email || row.name || 'unknown member'}.`);
    return row;
  });
  const database = await getDatabase();
  const knownEmails = new Set(database.members.map((member) => member.email.toLowerCase()));
  for (const row of rows) {
    const email = row.email.toLowerCase();
    if (knownEmails.has(email)) throw new Error(`Duplicate email is not allowed: ${row.email}.`);
    knownEmails.add(email);
  }
  const imported = [];
  for (const row of rows) imported.push(await addMember({ ...row, active: true }));
  return imported;
}

module.exports = { addMember, deleteMember, importCsv, updateMember, validateMember };
