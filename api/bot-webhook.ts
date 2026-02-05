import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Validate Request (Basic Check)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 🛡️ SECURITY: Verify Telegram Secret Token
  const secretToken = req.headers['x-telegram-bot-api-secret-token'];
  const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  
  // If configured, strict check. If not configured (dev), warn or skip.
  if (configuredSecret && secretToken !== configuredSecret) {
      console.warn('⚠️ Webhook Secret Mismatch');
      return res.status(403).json({ error: 'Unauthorized', message: 'Invalid Secret Token' });
  }

  try {
    const update = req.body;

    // 2. Check for Message and Command
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const userId = String(update.message.from.id);
      const text = update.message.text;

      if (text.startsWith('/start')) {
        // 3. Upsert User in Supabase
        // We use upsert to ensure user exists. 
        // We set initial defaults if its a new user.
        await supabase
          .from('users')
          .upsert({
             telegram_id: userId,
             // Optional: Update last seen or other metadata if you have columns
             updated_at: new Date().toISOString()
          }, { 
             onConflict: 'telegram_id', 
             ignoreDuplicates: true // Don't overwrite existing settings like premium
          });

        // 4. Send Welcome Message
        await sendTelegramMessage(chatId, 
          `👋 *Добро пожаловать в MaklerPro!* \n\n` +
          `Теперь вы можете отправлять готовые видео и фото прямо в этот чат из нашего приложения.\n\n` +
          `🚀 *Как это работает?*\n` +
          `1. Создайте контент в Mini App.\n` +
          `2. Нажмите кнопку "В чат" (Send to Bot).\n` +
          `3. Получите файл здесь в высоком качестве!\n\n` +
          `👇 Нажмите кнопку ниже, чтобы открыть приложение.`
        );
      }
    }

    // Always return 200 OK to Telegram, otherwise they will retry forever
    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

// Helper to send message
async function sendTelegramMessage(chatId: number | string, text: string) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: "📱 Открыть MaklerPro", web_app: { url: "https://YOUR_VERCEL_PROJECT_URL.vercel.app" } }]
        ]
      }
    })
  });
}
