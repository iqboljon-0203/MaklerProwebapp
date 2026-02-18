
import { Bot } from 'grammy';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS params
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!BOT_TOKEN) {
    return res.status(500).json({ error: 'Bot token missing' });
  }

  try {
    const { language_code } = req.body;
    const lang = (language_code === 'ru' ? 'ru' : 'uz');

    const title = "MaklerPro Premium";
    const description = lang === 'uz' 
      ? "Cheksiz imkoniyatlar: 4K eksport, brending va AI"
      : "Безлимитный доступ: 4K экспорт, брендинг и ИИ";

    const bot = new Bot(BOT_TOKEN);
    
    // Create Invoice Link for Telegram Stars
    // Documentation: https://core.telegram.org/bots/api#createinvoicelink
    const invoiceLink = await bot.api.createInvoiceLink(
      title,
      description,
      "full_premium_access", // payload
      "", // provider_token (Empty for Stars)
      "XTR", // currency
      [{ label: "Premium (1 month)", amount: 200 }] // prices
    );

    return res.status(200).json({ invoiceLink });
  } catch (error: any) {
    console.error('Invoice Creation Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
