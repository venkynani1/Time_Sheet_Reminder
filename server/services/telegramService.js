// Sends optional Telegram reminders when the channel is explicitly enabled.
async function sendReminder(member, message, confirmationUrl) {
  if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error('Telegram bot token is not configured.');
  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: member.telegramChatId, text: `${message}\n\nConfirm: ${confirmationUrl}` }),
  });
  if (!response.ok) throw new Error(`Telegram request failed with HTTP ${response.status}.`);
}

module.exports = { sendReminder };
