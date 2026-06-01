// Persists, validates, previews, and renders the shared reminder email template.
const { prisma } = require('./dataService');
const TEMPLATE_ID = 'default';

const defaultTemplate = {
  subject: 'Timesheet Submission Reminder',
  body: `Hi {{name}},

Please submit your timesheet before {{deadline}}.

Once submitted, please confirm here:
{{confirmationLink}}

Thank you.`,
};

function validateTemplate(template) {
  const errors = [];
  const warnings = [];
  if (!template.subject?.trim()) errors.push('Email subject cannot be empty.');
  if (!template.body?.trim()) errors.push('Email body cannot be empty.');
  if (template.body && !template.body.includes('{{confirmationLink}}')) errors.push('Email body must include {{confirmationLink}}.');
  if (template.body && !template.body.includes('{{name}}')) warnings.push('Email body does not include {{name}}. Personalized greeting is recommended.');
  return { errors, warnings };
}

function renderTemplate(template, values) {
  return {
    subject: template.subject.replaceAll('{{name}}', values.name).replaceAll('{{confirmationLink}}', values.confirmationLink).replaceAll('{{deadline}}', values.deadline).replaceAll('{{weekRange}}', values.weekRange),
    body: template.body.replaceAll('{{name}}', values.name).replaceAll('{{confirmationLink}}', values.confirmationLink).replaceAll('{{deadline}}', values.deadline).replaceAll('{{weekRange}}', values.weekRange),
  };
}

async function getTemplate() {
  return (await prisma.emailTemplate.findUnique({ where: { id: TEMPLATE_ID }, select: { subject: true, body: true } })) || defaultTemplate;
}

async function saveTemplate(template) {
  const cleaned = { subject: template.subject.trim(), body: template.body.trim() };
  const validation = validateTemplate(cleaned);
  if (validation.errors.length) return { ...validation, template: null };
  await prisma.emailTemplate.upsert({ where: { id: TEMPLATE_ID }, update: cleaned, create: { id: TEMPLATE_ID, ...cleaned } });
  return { ...validation, template: cleaned };
}

function previewTemplate(template) {
  return renderTemplate(template, {
    name: 'Test User',
    confirmationLink: 'http://localhost:5173/confirm/sample-token',
    deadline: 'Monday 9:00 AM',
    weekRange: 'Friday to Monday',
  });
}

module.exports = { defaultTemplate, getTemplate, previewTemplate, renderTemplate, saveTemplate, validateTemplate };
