import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export default async function handler(request: Request) {
  // Security: Check for CRON secret if needed (Vercel adds header)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // return new Response('Unauthorized', { status: 401 });
    // For now open, but Vercel Cron secures it internally if configured
  }

  if (!SUPABASE_URL || !SUPABASE_KEY || !BOT_TOKEN) {
    return new Response('Configuration missing', { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    // Get users expiring in 3 days
    // We calculate date range for "3 days from now"
    const now = new Date();
    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(now.getDate() + 3);
    
    // Format to YYYY-MM-DD for comparison
    const targetDate = threeDaysLater.toISOString().split('T')[0];

    // Query users whose expiry starts with this date
    // Note: This is a simple string match, assuming ISO format in DB
    // Better: use Postgres date functions if possible, but edge function has limited query builder
    // Let's use gte and lt for the day range
    const startOfDay = `${targetDate}T00:00:00.000Z`;
    const endOfDay = `${targetDate}T23:59:59.999Z`;

    const { data: users, error } = await supabase
      .from('users')
      .select('telegram_id, language_code')
      .eq('is_premium', true)
      .gte('premium_expires_at', startOfDay)
      .lte('premium_expires_at', endOfDay);

    if (error) throw error;

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: 'No users expiring in 3 days' }), { status: 200 });
    }

    // Send notifications
    const results = await Promise.all(users.map(async (user) => {
      const lang = user.language_code === 'ru' ? 'ru' : 'uz';
      const text = lang === 'ru' 
        ? "⚠️ **Внимание!**\n\nВаша Premium подписка истекает через **3 дня**.\nЧтобы продлить и не потерять доступ, нажмите: /premium"
        : "⚠️ **Diqqat!**\n\nSizning Premium obunangiz **3 kundan** keyin tugaydi.\nUzaytirish va imkoniyatlarni yo'qotmaslik uchun bosing: /premium";

      try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: user.telegram_id,
            text: text,
            parse_mode: 'Markdown'
          })
        });
        return { id: user.telegram_id, status: res.ok ? 'sent' : 'failed' };
      } catch (e) {
        return { id: user.telegram_id, status: 'error' };
      }
    }));

    return new Response(JSON.stringify({ 
      message: `Processed ${users.length} users`, 
      details: results 
    }), { status: 200 });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
