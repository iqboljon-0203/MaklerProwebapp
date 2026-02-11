
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env simply
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            if (key && value) process.env[key] = value;
        }
    });

}

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.error('Error: TELEGRAM_BOT_TOKEN not found in .env');
    process.exit(1);
}

const url = `https://api.telegram.org/bot${token}/getWebhookInfo`;
console.log(`Checking webhook for token ending in ...${token.slice(-5)}`);

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const result = JSON.parse(data);
            console.log('Webhook Status:', JSON.stringify(result, null, 2));
        } catch (e) {
            console.error('Failed to parse response:', data);
        }
    });
}).on('error', (e) => {
    console.error('Network Error:', e);
});
