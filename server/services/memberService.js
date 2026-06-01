// Manages saved team members and their stable confirmation tokens.
const { prisma } = require('./dataService');
const timesheetService = require('./timesheetService');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateMember(input) {
  if (!input.name?.trim()) return 'Name is required.';
  if (!emailPattern.test(input.email || '')) return 'A valid email is required.';
  return null;
}

async function addMember(input) {
  const email = input.email.trim();
  if (await prisma.member.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })) throw new Error('A team member with this email already exists.');
  const member = await prisma.member.create({ data: {
    name: input.name.trim(), email,
    mobile: input.mobile?.trim() || '', telegramChatId: input.telegramChatId?.trim() || '',
    active: input.active !== false,
  } });
  await timesheetService.addMemberToCurrentCycle(member.id);
  return member;
}

async function updateMember(id, input) {
  const email = input.email.trim();
  const duplicate = await prisma.member.findFirst({ where: { id: { not: id }, email: { equals: email, mode: 'insensitive' } } });
  if (duplicate) throw new Error('A team member with this email already exists.');
  const result = await prisma.member.updateMany({
    where: { id },
    data: {
      name: input.name.trim(), email, mobile: input.mobile?.trim() || '',
      telegramChatId: input.telegramChatId?.trim() || '', active: input.active !== false,
    },
  });
  return result.count ? prisma.member.findUnique({ where: { id } }) : null;
}

async function deleteMember(id) {
  return (await prisma.member.deleteMany({ where: { id } })).count > 0;
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
  const knownEmails = new Set((await prisma.member.findMany({ select: { email: true } })).map((member) => member.email.toLowerCase()));
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
