import { Bot, webhookCallback } from 'grammy';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BotContext, DBUser, PaymentRecord } from './types';

// ==========================================
// CONFIGURATION & CLIENTS
// ==========================================

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const WEBAPP_URL = process.env.VITE_APP_URL || 'https://makler-pro-three.vercel.app';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim());

if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is missing');

// Supabase Admin Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin: SupabaseClient | null = null;

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
// BOT INITIALIZATION
// ==========================================

const bot = new Bot<BotContext>(BOT_TOKEN);

// Middleware: Upsert User & Attach to Context
bot.use(async (ctx, next) => {
  if (!ctx.from || !supabaseAdmin) {
    return next();
  }

  const telegramUser = ctx.from;
  const telegramId = String(telegramUser.id);
  const now = new Date().toISOString();

  // Try to get existing user
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('*') // Get full user to attach to context
    .eq('telegram_id', telegramId)
    .single();

  // Check Premium Expiry
  if (existingUser?.is_premium && existingUser.premium_expires_at) {
      const expiryDate = new Date(existingUser.premium_expires_at);
      if (expiryDate < new Date()) {
           console.log(`User ${telegramId} premium expired on ${expiryDate}`);
           await supabaseAdmin.from('users').update({
               is_premium: false,
               max_daily_generations: 5,
               premium_expires_at: null
           }).eq('telegram_id', telegramId);
           
           // Update local object so context is correct
           existingUser.is_premium = false;
           existingUser.max_daily_generations = 5;
           existingUser.premium_expires_at = null;
      }
  }

  // Determine Lang
  let finalLang = existingUser?.language_code || 'uz'; // Default
  if (!existingUser && telegramUser.language_code && ['uz', 'ru'].includes(telegramUser.language_code)) {
    finalLang = telegramUser.language_code;
  }

  // Upsert Payload
  const upsertData: Partial<DBUser> = {
    telegram_id: telegramId,
    first_name: telegramUser.first_name,
    username: telegramUser.username || null,
    last_active: now,
    language_code: finalLang,
    // On insert defaults
    is_premium: existingUser ? undefined : false,
    daily_generations: existingUser ? undefined : 0,
    max_daily_generations: existingUser ? undefined : 5
  };

  const { data: upsertedUser, error } = await supabaseAdmin
    .from('users')
    .upsert(upsertData, { onConflict: 'telegram_id' })
    .select()
    .single();

  if (error) {
    console.error('Supabase Upsert Error:', error);
  }

  // Attach to Context
  if (upsertedUser) {
    ctx.user = upsertedUser as DBUser;
  } else if (existingUser) {
     ctx.user = existingUser as DBUser;
  }

  return next();
});


// ==========================================
// TRANSLATIONS
// ==========================================

const MESSAGES = {
  uz: {
    welcome: (name: string) => `Assalomu alaykum, ${name}! 👋\n\n**MaklerPro** - Ko'chmas mulk agentlari uchun №1 yordamchi.\n\nImkoniyatlar:\n✨ **Magic Fix** - Rasmlarni tahrirlash\n📹 **Video Generator** - Reels yasash\n📝 **AI Tavsif** - Matn yozish\n\nBoshlash uchun pastdagi tugmani bosing 👇`,
    help: `**MaklerPro Yordam Markazi** 💡\n\nSavollar bo'lsa @MaklerProSupport ga yozing.`,
    premium_desc: `🌟 **MaklerPro Premium**\n\n• Cheksiz AI tavsiflar\n• Yuqori sifatli Video (4K)\n• Suv belgisiz (No Watermark)\n• Ustuvor yordam\n\nNarxi: **200 Stars** (oyiga)`,
    premium_success: `🎉 Tabriklaymiz! Siz **Premium** a'zosisiz.\n\nEndi barcha imkoniyatlardan cheklovsiz foydalana olasiz!`,
    buy_btn: "⭐️ Premium sotib olish (200 Stars)",
    open_app: "🚀 Ilovani ochish"
  },
  ru: {
    welcome: (name: string) => `Привет, ${name}! 👋\n\n**MaklerPro** - Помощник №1 для риелторов.\n\nВозможности:\n✨ **Magic Fix** - Улучшение фото\n📹 **Video Generator** - Создание Reels\n📝 **AI Описание** - Продающие тексты\n\nНажмите кнопку ниже, чтобы начать 👇`,
    help: `**Центр поддержки MaklerPro** 💡\n\nЕсли есть вопросы, пишите @MaklerProSupport.`,
    premium_desc: `🌟 **MaklerPro Premium**\n\n• Безлимитные AI описания\n• Высокое качество видео (4K)\n• Без водяных знаков\n• Приоритетная поддержка\n\nЦена: **200 Stars** (в месяц)`,
    premium_success: `🎉 Поздравляем! Вы теперь **Premium** пользователь.\n\nВсе ограничения сняты!`,
    buy_btn: "⭐️ Купить Premium (200 Stars)",
    open_app: "🚀 Открыть приложение"
  }
};

// ==========================================
// HANDLERS
// ==========================================

bot.command('admin', async (ctx) => {
    const userId = String(ctx.from?.id);
    if (!ADMIN_IDS.includes(userId)) {
        return ctx.reply(`⛔️ Siz admin emassiz.\nSizning ID: \`${userId}\``, { parse_mode: 'Markdown' });
    }
    
    if (!supabaseAdmin) return ctx.reply("Database error");

    try {
        // Gather Stats
        const { count: totalUsers } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true });
        const { count: premiumUsers } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('is_premium', true);
        
        // Today Active
        const today = new Date();
        today.setHours(0,0,0,0);
        const { count: activeToday } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).gte('last_active', today.toISOString());

        // Revenue (Approximate count * 200)
        const { count: totalPayments } = await supabaseAdmin.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'paid');
        const revenue = (totalPayments || 0) * 200;

        const report = `📊 **MaklerPro Admin Panel**\n\n` +
            `👥 Jami foydalanuvchilar: **${totalUsers}**\n` +
            `⭐️ Premium a'zolar: **${premiumUsers}**\n` +
            `📅 Bugun faol: **${activeToday}**\n` +
            `💰 Tushum (Stars): **${revenue}**\n\n` +
            `Sizning ID: \`${userId}\``;

        await ctx.reply(report, { parse_mode: 'Markdown' });
    } catch (e) {
        console.error('Admin Stats Error:', e);
        await ctx.reply("Statistikani olishda xatolik.");
    }
});

bot.command('start', async (ctx) => {
  const payload = ctx.match; // Extracts payload after /start

  // 1. Deep Link: ?start=premium
  if (payload === 'premium') {
      const lang = (ctx.user?.language_code || 'uz') as 'uz' | 'ru';
      const content = MESSAGES[lang] || MESSAGES['uz'];
      // @ts-ignore
      await ctx.api.sendInvoice(
          ctx.chat.id,
          "MaklerPro Premium",
          content.premium_desc || "Premium Subscription",
          "full_premium_access",
          "", // provider_token
          "XTR", // currency
          [{ label: "Premium (1 month)", amount: 200 }] // prices
      );
      return;
  }

  // 2. Normal /start - Show Language Selection
  await ctx.reply("🇺🇿 Tilni tanlang / 🇷🇺 Выберите язык", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🇺🇿 O'zbekcha", callback_data: "lang_uz" },
          { text: "🇷🇺 Русский", callback_data: "lang_ru" }
        ]
      ]
    }
  });
});


bot.command('help', async (ctx) => {
  const lang = (ctx.user?.language_code || 'uz') as 'uz' | 'ru';
  const content = MESSAGES[lang] || MESSAGES['uz'];
  await ctx.reply(content.help, {
     parse_mode: 'Markdown',
     reply_markup: {
      inline_keyboard: [[{ text: content.open_app, web_app: { url: `${WEBAPP_URL}?lang=${lang}` } }]]
    }
  });
});

bot.command('premium', async (ctx) => {
    const lang = (ctx.user?.language_code || 'uz') as 'uz' | 'ru';
    const content = MESSAGES[lang] || MESSAGES['uz'];

    // Send Invoice for Telegram Stars
    // Using ctx.api.sendInvoice for explicit argument control
    // @ts-ignore
    await ctx.api.sendInvoice(
        ctx.chat.id,
        "MaklerPro Premium",
        content.premium_desc || "Premium Subscription",
        "full_premium_access",
        "", // provider_token (MUST BE EMPTY for Stars)
        "XTR", // currency
        [{ label: "Premium (1 month)", amount: 200 }] // prices
    );
});

// Using callback query to trigger invoice (optional)
bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;
    
    if (data === 'buy_premium') {
        const lang = (ctx.user?.language_code || 'uz') as 'uz' | 'ru';
        const content = MESSAGES[lang] || MESSAGES['uz'];
        
        // @ts-ignore
        await ctx.api.sendInvoice(
            ctx.chat?.id || ctx.from.id,
            "MaklerPro Premium",
            content.premium_desc || "Premium Subscription",
            "full_premium_access",
            "", // provider_token
            "XTR", // currency
            [{ label: "Premium Subscription", amount: 200 }] // prices
        );
        await ctx.answerCallbackQuery();
        return;
    }

    if (data.startsWith('lang_')) {
        const lang = data.split('_')[1] as 'uz' | 'ru';
        
        // Update DB
        if (supabaseAdmin && ctx.from) {
             await supabaseAdmin.from('users').update({ language_code: lang }).eq('telegram_id', String(ctx.from.id));
        }

        // Set Menu Button (Persistent for future)
        try {
            await ctx.api.setChatMenuButton({
                chat_id: ctx.chat?.id,
                menu_button: {
                    type: 'web_app',
                    text: 'MaklerPro',
                    web_app: { url: `${WEBAPP_URL}?lang=${lang}` }
                }
            });
        } catch (e) {
            console.error('Failed to set menu button', e);
        }

        await ctx.deleteMessage();
        
        // Send Welcome Message
        const content = MESSAGES[lang] || MESSAGES['uz'];
        await ctx.reply(content.welcome(ctx.from?.first_name || 'User'), {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[{ text: content.open_app, web_app: { url: `${WEBAPP_URL}?lang=${lang}` } }]]
            }
        });
        await ctx.answerCallbackQuery();
    }
});

// ==========================================
// PAYMENT HANDLERS
// ==========================================

// 1. Pre-Checkout Query (Must answer with ok: true)
bot.on("pre_checkout_query", async (ctx) => {
    await ctx.answerPreCheckoutQuery(true);
});

// 2. Successful Payment
bot.on("message:successful_payment", async (ctx) => {
    const payment = ctx.message.successful_payment;
    const telegramId = String(ctx.from.id);
    const lang = (ctx.user?.language_code || 'uz') as 'uz' | 'ru';
    const content = MESSAGES[lang] || MESSAGES['uz'];

    if (!supabaseAdmin) {
        console.error("FATAL: Supabase Admin not initialized for payment processing");
        return;
    }

    try {
        // A. Update User to Premium
        
        // Calculate expiry: Now + 30 days
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

        const { error: userError } = await supabaseAdmin
            .from('users')
            .update({ 
                is_premium: true,
                max_daily_generations: 9999, // Unlimited
                premium_expires_at: expiresAt
            })
            .eq('telegram_id', telegramId);

        if (userError) throw userError;

        // B. Record Payment
        const paymentRecord: PaymentRecord = {
            telegram_id: telegramId,
            provider: 'stars',
            amount: payment.total_amount, // 200
            currency: 'XTR',
            payment_id: payment.telegram_payment_charge_id,
            status: 'paid',
            metadata: payment
        };

        const { error: paymentError } = await supabaseAdmin
            .from('payments')
            .insert(paymentRecord);
            
        if (paymentError) console.error("Failed to record payment:", paymentError);

        // C. Send Verification
        await ctx.reply(content.premium_success, { parse_mode: 'Markdown' });

    } catch (e) {
        console.error("Payment Processing Error:", e);
        await ctx.reply("System Error: Payment received but activation failed. Please contact support.");
    }
});

// ==========================================
// MAIN WEBHOOK HANDLER
// ==========================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const secretToken = req.headers['x-telegram-bot-api-secret-token'];
    if (WEBHOOK_SECRET && secretToken !== WEBHOOK_SECRET) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Initialize bot info if needed (optional for simple commands)
    await bot.init();

    // Handle Update
    // Vercel parses JSON body automatically
    await bot.handleUpdate(req.body);

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Bot Webhook Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
