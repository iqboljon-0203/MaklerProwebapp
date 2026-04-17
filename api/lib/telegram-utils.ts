import fetch from 'node-fetch';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/**
 * Validates initData from Telegram WebApp
 */
export async function validateTelegramWebAppData(
  telegramInitData: string, 
  botToken: string
): Promise<boolean> {
  try {
    const urlParams = new URLSearchParams(telegramInitData);
    const hash = urlParams.get('hash');
    if (!hash) return false;

    urlParams.delete('hash');
    
    const params: string[] = [];
    urlParams.forEach((value, key) => params.push(`${key}=${value}`));
    params.sort();
    
    const dataCheckString = params.join('\n');
    const encoder = new TextEncoder();

    // Import the secret key
    const secretKeyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // Sign with bot token to get the actual key
    const secretKey = await crypto.subtle.sign(
      'HMAC', 
      secretKeyMaterial, 
      encoder.encode(botToken)
    );

    // Import the validation key
    const validationKey = await crypto.subtle.importKey(
      'raw',
      secretKey,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Sign the data string
    const signature = await crypto.subtle.sign(
      'HMAC',
      validationKey,
      encoder.encode(dataCheckString)
    );

    // Convert signature to hex
    const hex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return hex === hash;
  } catch (e) {
    console.error('Validation error:', e);
    return false;
  }
}

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
