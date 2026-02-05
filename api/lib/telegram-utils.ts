import fetch from 'node-fetch';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function sendMessage(chatId: number | string, text: string, extra?: any) {
  if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not defined');

  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      ...extra,
    }),
  });

  return response.json();
}

export async function setChatMenuButton(chatId: number | string, webAppUrl: string) {
  if (!BOT_TOKEN) return;

  // Set the "Menu" button (the permanent one next to input)
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setChatMenuButton`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      menu_button: {
        type: 'web_app',
        text: 'MaklerPro',
        web_app: { url: webAppUrl },
      },
    }),
  });
}
