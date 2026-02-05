import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './lib/supabase-admin.js';
import { sendMessage, setChatMenuButton } from './lib/telegram-utils.js';

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const WEBAPP_URL = 'https://makler-pro-three.vercel.app'; 

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 1. Security Check
    const secretToken = req.headers['x-telegram-bot-api-secret-token'];
    if (WEBHOOK_SECRET && secretToken !== WEBHOOK_SECRET) {
      console.warn('Unauthorized access attempt');
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // 2. Parse Update
    const { message } = req.body;
    
    // Ignore non-message updates or non-text messages for now
    if (!message || !message.text) {
      return res.status(200).json({ status: 'ok' });
    }

    const chatId = message.chat.id;
    const telegramId = String(message.from?.id);
    const username = message.from?.username || '';
    const firstName = message.from?.first_name || 'Foydalanuvchi';
    const text = message.text;

    // 3. Handle Commands
    if (text === '/start') {
      await handleStart(chatId, telegramId, username, firstName);
    } else if (text === '/help') {
      await handleHelp(chatId);
    }

    return res.status(200).json({ status: 'ok' });

  } catch (error) {
    console.error('Bot Webhook Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function handleStart(chatId: number, telegramId: string, username: string, firstName: string) {
  // 1. Check/Create User in Supabase
  try {
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('telegram_id', telegramId)
      .single();

    if (!existingUser) {
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          telegram_id: telegramId,
          first_name: firstName,
          username: username,
          is_premium: false,
          daily_generations: 0, // Ensure column name matches your schema (was daily_usage or daily_generations?)
          max_daily_generations: 5
        });

      if (insertError) {
        console.error('Failed to create user:', insertError);
      }
    }
  } catch (e) {
    console.error('User sync error:', e);
  }

  // 2. Set Menu Button
  await setChatMenuButton(chatId, WEBAPP_URL);

  // 3. Send Welcome Message
  const welcomeText = `
Assalomu alaykum, ${firstName}! 👋

**MaklerPro** - Ko'chmas mulk agentlari uchun №1 yordamchi.

Imkoniyatlar:
✨ **Magic Fix** - Rasmlarni tahrirlash va yorqinlashtirish
📹 **Video Generator** - Rasmlardan Reels yasash
📝 **AI Tavsif** - Sotuvchi matnlar yozish

Boshlash uchun pastdagi tugmani bosing 👇
`.trim();

  await sendMessage(chatId, welcomeText, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🚀 Ilovani ochish", web_app: { url: WEBAPP_URL } }
        ]
      ]
    }
  });
}

async function handleHelp(chatId: number) {
  const helpText = `
**MaklerPro Yordam Markazi** 💡

Bizning ilova orqali siz:
1️⃣ **Rasmlarni Tiniqlashtirish** - Xira rasmlarni "Magic Fix" orqali to'g'irlang.
2️⃣ **Video Yasash** - Uylarning rasmlaridan chiroyli slayd-shou (Reels) yarating.
3️⃣ **Matn Yozish** - Telegram va Instagram uchun sotuvchi postlar yozdiring.

Savollar bo'lsa, @admin ga yozing.
`.trim();

  await sendMessage(chatId, helpText, {
    reply_markup: {
      inline_keyboard: [
        [
            { text: "📱 Ilovani ochish", web_app: { url: WEBAPP_URL } }
        ]
      ]
    }
  });
}
