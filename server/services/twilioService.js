// Wraps the Twilio SDK so provider-specific logic stays isolated.
const twilio = require('twilio');

function getClient() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;

  if (process.env.TWILIO_ENABLED !== 'true') {
    throw new Error('Twilio SMS is disabled. Use the free email provider by default.');
  }

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    throw new Error('Twilio credentials are not configured on the server.');
  }

  return {
    client: twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
    from: TWILIO_PHONE_NUMBER,
  };
}

async function sendMessage(to, body) {
  const { client, from } = getClient();
  return client.messages.create({ body, from, to });
}

module.exports = { sendMessage };
