import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath).toString();
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) process.env[key.trim()] = value.trim();
    });
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'my-secret-token-123';
const WEBHOOK_URL = process.argv[2];

if (!BOT_TOKEN) {
    console.error('❌ Error: TELEGRAM_BOT_TOKEN not found in .env');
    process.exit(1);
}

if (!WEBHOOK_URL) {
    console.error('❌ Error: Please provide the Webhook URL');
    console.log('Usage: node scripts/set-webhook.js https://your-project.vercel.app/api/bot-webhook');
    process.exit(1);
}

const url = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`;
const body = JSON.stringify({
    url: WEBHOOK_URL,
    secret_token: WEBHOOK_SECRET,
    // allowed_updates: ['message', 'callback_query'] // Optional
});

const req = https.request(url, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': body.length
    }
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const result = JSON.parse(data);
        if (result.ok) {
            console.log('✅ Webhook successfully set!');
            console.log(`URL: ${WEBHOOK_URL}`);
            console.log(`Secret: ${WEBHOOK_SECRET}`);
        } else {
            console.error('❌ Failed to set webhook:', result);
        }
    });
});

req.on('error', (e) => {
    console.error('❌ Network error:', e);
});

req.write(body);
req.end();
