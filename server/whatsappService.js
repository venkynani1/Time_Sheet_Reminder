// Optional unofficial WhatsApp Web automation for consented reminder delivery.
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

let client = null;
let initializationPromise = null;
let connected = false;
let lastError = null;

function isEnabled() {
  return process.env.WHATSAPP_ENABLED === 'true';
}

function getSessionPath() {
  return process.env.WHATSAPP_SESSION_PATH || '.wwebjs_auth';
}

function buildReminderMessage(member, { confirmationLink, deadline }) {
  return `Hi ${member.name},

Please submit your timesheet before ${deadline}.

After submitting, confirm here:
${confirmationLink}`;
}

function normalizeMobile(mobile) {
  const digits = String(mobile || '').replace(/\D/g, '');
  if (!digits) return null;
  if (/^\d{10}$/.test(digits)) return `91${digits}`;
  if (/^[1-9]\d{10,14}$/.test(digits)) return digits;
  return null;
}

function initialize() {
  if (!isEnabled()) return null;
  if (initializationPromise) return initializationPromise;

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: getSessionPath() }),
    puppeteer: {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });

  client.on('qr', (qr) => {
    console.log('WhatsApp login QR code: scan this with the WhatsApp mobile app.');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    connected = true;
    lastError = null;
    console.log('WhatsApp client is connected.');
  });

  client.on('authenticated', () => {
    lastError = null;
    console.log('WhatsApp client authenticated.');
  });

  client.on('auth_failure', (message) => {
    connected = false;
    lastError = message || 'WhatsApp authentication failed.';
    console.error(`WhatsApp authentication failed: ${lastError}`);
  });

  client.on('disconnected', (reason) => {
    connected = false;
    lastError = reason || 'WhatsApp client disconnected.';
    console.warn(`WhatsApp client disconnected: ${lastError}`);
    client = null;
    initializationPromise = null;
  });

  initializationPromise = client.initialize().catch((error) => {
    connected = false;
    lastError = error.message || 'WhatsApp initialization failed.';
    client = null;
    initializationPromise = null;
    console.error(`WhatsApp initialization failed: ${lastError}`);
  });

  return initializationPromise;
}

async function sendReminder(member, options) {
  if (!isEnabled()) return { status: 'SKIPPED', error: 'WhatsApp is disabled.' };

  const normalizedMobile = normalizeMobile(member.mobile);
  if (!normalizedMobile) return { status: 'SKIPPED', error: 'Member mobile number is missing or invalid.' };

  initialize();
  if (!client || !connected) return { status: 'FAILED', error: 'WhatsApp client is not connected. Scan the QR code to log in.' };

  try {
    await client.sendMessage(`${normalizedMobile}@c.us`, buildReminderMessage(member, options));
    return { status: 'SENT', error: null };
  } catch (error) {
    lastError = error.message || 'WhatsApp send failed.';
    return { status: 'FAILED', error: lastError };
  }
}

function getStatus() {
  return {
    enabled: isEnabled(),
    connected: isEnabled() && connected,
    lastError,
  };
}

module.exports = { buildReminderMessage, getStatus, initialize, normalizeMobile, sendReminder };
