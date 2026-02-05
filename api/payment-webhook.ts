import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './lib/supabase-admin.js';
import { sendMessage } from './lib/telegram-utils.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow POST requests from payment providers
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // In a real scenario, you verify the signature from Click/Payme here.
    // Body: { telegram_id: "12345", status: "success", amount: ..., ... }
    const { telegram_id, status } = req.body;

    if (!telegram_id) {
        return res.status(400).json({ error: 'Missing telegram_id in payload' });
    }

    // Update User Status in Supabase
    const { error } = await supabaseAdmin
      .from('users')
      .update({ 
          is_premium: true,
           // You might want to log the transaction in a 'payments' table too
      })
      .eq('telegram_id', String(telegram_id));

    if (error) {
      console.error('Failed to update premium status:', error);
      return res.status(500).json({ error: 'Database update failed' });
    }

    // Send Notification to User via Bot
    try {
        await sendMessage(telegram_id, 
            `🎉 **Tabriklaymiz! Siz PRO darajasiga o'tdingiz.**\n\n` +
            `Cheklovlar olib tashlandi. Barcha AI funksiyalardan bemalol foydalaning!`
        );
    } catch (e) {
         console.error('Failed to send success message:', e);
         // Don't fail the webhook response just because message failed
    }

    return res.status(200).json({ 
        success: true, 
        message: 'Premium activated successfully' 
    });

  } catch (err: any) {
    console.error('Payment Webhook Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
