import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// ==========================================
// CONFIGURATION & CLIENTS
// ==========================================

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
}

// ==========================================
// TELEGRAM UTILS
// ==========================================

async function sendMessage(chatId: number | string, text: string, extra?: any) {
  if (!BOT_TOKEN) return;
  
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        ...extra,
      }),
    });
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

// ==========================================
// MAIN HANDLER
// ==========================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Basic payload validation
    const { telegram_id, status } = req.body;

    if (!telegram_id) {
        return res.status(400).json({ error: 'Missing telegram_id in payload' });
    }

    // Update User in Database
    if (supabaseAdmin) {
        const { error } = await supabaseAdmin
        .from('users')
        .update({
            is_premium: true,
        })
        .eq('telegram_id', String(telegram_id));

        if (error) {
            console.error('Failed to update premium status:', error);
            // We continue to send success response to payment provider, but log the error
            // Or return 500? Use 500 to signal retry
            return res.status(500).json({ error: 'Database update failed' });
        }
    } else {
        console.error('Supabase Admin NOT initialized');
        return res.status(500).json({ error: 'System Configuration Error' });
    }

    // Send Notification to User
    await sendMessage(telegram_id, 
        `🎉 **Tabriklaymiz! Siz PRO darajasiga o'tdingiz.**\n\nCheklovlar olib tashlandi. Barcha AI funksiyalardan bemalol foydalaning!`
    );

    return res.status(200).json({
        success: true,
        message: 'Premium activated successfully'
    });

  } catch (err: any) {
    console.error('Payment Webhook Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
