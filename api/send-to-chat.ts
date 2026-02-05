import type { VercelRequest, VercelResponse } from '@vercel/node';
import { IncomingForm } from 'formidable';
import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parse error:', err);
      return res.status(500).json({ error: 'Error parsing upload' });
    }

    const chatIdField = Array.isArray(fields.chatId) ? fields.chatId[0] : fields.chatId;
    const captionField = Array.isArray(fields.caption) ? fields.caption[0] : fields.caption;
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file || !chatIdField) {
       return res.status(400).json({ error: 'Missing file or chatId' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
      // Create FormData for Telegram API
      const telegramForm = new FormData();
      telegramForm.append('chat_id', chatIdField as string);
      telegramForm.append('caption', (captionField as string) || 'Sent via MaklerPro');
      
      // Stream file from temp path to Telegram
      const fileStream = fs.createReadStream(file.filepath);
      telegramForm.append('document', fileStream, {
        filename: file.originalFilename || 'document.png',
        contentType: file.mimetype || 'application/octet-stream',
      });

      const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
        method: 'POST',
        body: telegramForm,
        headers: telegramForm.getHeaders(),
      });

      const telegramResult: any = await telegramResponse.json();

      if (!telegramResponse.ok || !telegramResult.ok) {
        console.error('Telegram API Error:', telegramResult);
        
        // Check for specific Telegram errors indicating bot is not started/blocked
        const description = telegramResult.description?.toLowerCase() || '';
        if (telegramResult.error_code === 403 || description.includes('chat not found') || description.includes('blocked')) {
             return res.status(403).json({ 
                 error: 'BOT_NOT_STARTED', 
                 message: 'Bot is not started or blocked by user.' 
             });
        }

        throw new Error(telegramResult.description || 'Failed to send to Telegram');
      }

      return res.status(200).json({ success: true, result: telegramResult });

    } catch (error: any) {
      console.error('Send Error:', error);
      // Ensure we pass through the custom error if we threw it, or generic if we can't
      // However, above we return res directly for specific cases.
      // If we are here, it's mostly network or unknown errors.
      return res.status(500).json({ error: error.message });
    }
  });
}
