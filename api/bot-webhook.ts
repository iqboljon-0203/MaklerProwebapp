import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// ==========================================
// CONFIGURATION & CLIENTS (Inlined to fix import issues)
// ==========================================

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const WEBAPP_URL = process.env.VITE_APP_URL || 'https://makler-pro-three.vercel.app';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Supabase Admin Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin: any = null;

if (supabaseUrl && supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
} else {
  console.error('CRITICAL: Missing Supabase Environment Variables');
}

// ==========================================
// TELEGRAM UTILS
// ==========================================

async function sendMessage(chatId: number | string, text: string, extra?: any) {
  if (!BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is missing');
    return;
  }
  
  try {
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
    
    const data = await response.json();
    if (!data.ok) {
        console.error('Telegram API Error:', data);
    }
    return data;
  } catch (error) {
    console.error('Network Error sending message:', error);
  }
}

async function setChatMenuButton(chatId: number | string, webAppUrl: string) {
  if (!BOT_TOKEN) return;

  try {
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
  } catch (e) {
      console.error('Failed to set menu button:', e);
  }
}

// ==========================================
// MAIN HANDLER
// ==========================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 1. Security Check
    const secretToken = req.headers['x-telegram-bot-api-secret-token'];
    if (WEBHOOK_SECRET && secretToken !== WEBHOOK_SECRET) {
      console.warn('Unauthorized access attempt: Invalid Secret Token');
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // 2. Parse Update
    const { message } = req.body;
    
    // Ignore non-message updates or non-text messages
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

// ==========================================
// LOGIC
// ==========================================

async function handleStart(chatId: number, telegramId: string, username: string, firstName: string) {
  // 1. Check/Create User in Supabase
  if (supabaseAdmin) {
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
              daily_generations: 0,
              max_daily_generations: 5
            });

          if (insertError) {
            console.error('Failed to create user:', insertError);
          }
        }
      } catch (e) {
        console.error('User sync error:', e);
      }
  } else {
      console.error('Supabase Admin not initialized, skipping user sync');
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
