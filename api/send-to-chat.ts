import type { VercelRequest, VercelResponse } from '@vercel/node';
import { IncomingForm } from 'formidable';
import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { validateTelegramWebAppData } from './lib/telegram-utils';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // 1. Security Validation
  const initData = req.headers['x-telegram-init-data'] as string;
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (initData) {
    const isValid = await validateTelegramWebAppData(initData, botToken);
    if (!isValid && !isDevelopment) {
      return res.status(403).json({ error: 'Unauthorized: Invalid Telegram data' });
    }
  } else if (!isDevelopment) {
    return res.status(401).json({ error: 'Unauthorized: Auth required' });
  }

  // Check if it's a JSON request (for URL sending) or Multipart (for file upload)
  const contentType = req.headers['content-type'] || '';
  
  if (contentType.includes('application/json')) {
    // Handling sending via URL
    try {
      const { chatId, fileUrl, caption, type = 'document' } = req.body;

      if (!chatId || !fileUrl) {
         return res.status(400).json({ error: 'Missing fileUrl or chatId' });
      }

      const method = type === 'video' ? 'sendVideo' : 'sendDocument';
      const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          [type === 'video' ? 'video' : 'document']: fileUrl,
          caption: caption || 'Sent via MaklerPro',
        }),
      });

      const telegramResult: any = await telegramResponse.json();
      if (!telegramResponse.ok || !telegramResult.ok) {
        return res.status(telegramResponse.status).json({ 
          error: telegramResult.description || 'Failed to send to Telegram via URL' 
        });
      }

      return res.status(200).json({ success: true, result: telegramResult });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  } else {
    // Handling traditional file upload (Multipart)
    const form = new IncomingForm();

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Form parse error:', err);
        return res.status(500).json({ error: 'Error parsing upload' });
      }

      const chatIdField = Array.isArray(fields.chatId) ? fields.chatId[0] : fields.chatId;
      const captionField = Array.isArray(fields.caption) ? fields.caption[0] : fields.caption;
      const typeField = Array.isArray(fields.type) ? fields.type[0] : fields.type;
      const file = Array.isArray(files.file) ? files.file[0] : files.file;

      if (!file || !chatIdField) {
         return res.status(400).json({ error: 'Missing file or chatId' });
      }

      try {
        const telegramForm = new FormData();
        telegramForm.append('chat_id', chatIdField as string);
        telegramForm.append('caption', (captionField as string) || 'Sent via MaklerPro');
        
        const method = typeField === 'video' ? 'sendVideo' : 'sendDocument';
        const fieldName = typeField === 'video' ? 'video' : 'document';

        const fileStream = fs.createReadStream(file.filepath);
        telegramForm.append(fieldName, fileStream, {
          filename: file.originalFilename || 'file',
          contentType: file.mimetype || 'application/octet-stream',
        });

        const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
          method: 'POST',
          body: telegramForm,
          headers: telegramForm.getHeaders(),
        });

        const telegramResult: any = await telegramResponse.json();

        if (!telegramResponse.ok || !telegramResult.ok) {
          const description = telegramResult.description?.toLowerCase() || '';
          if (telegramResult.error_code === 403 || description.includes('chat not found') || description.includes('blocked')) {
               return res.status(403).json({ error: 'BOT_NOT_STARTED' });
          }
          throw new Error(telegramResult.description || 'Failed to send to Telegram');
        }

        return res.status(200).json({ success: true, result: telegramResult });

      } catch (error: any) {
        return res.status(500).json({ error: error.message });
      }
    });
  }
}
