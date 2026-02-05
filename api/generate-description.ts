import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge', // Vercel Edge Runtime
};

// ==========================================
// 1. Validation Logic (Web Crypto API)
// ==========================================
async function validateTelegramWebAppData(telegramInitData: string, botToken: string): Promise<boolean> {
  const urlParams = new URLSearchParams(telegramInitData);
  const hash = urlParams.get('hash');
  if (!hash) return false;

  urlParams.delete('hash');
  
  const params: string[] = [];
  urlParams.forEach((value, key) => params.push(`${key}=${value}`));
  params.sort();
  
  const dataCheckString = params.join('\n');
  const encoder = new TextEncoder();

  // 1. Create Secret Key: HMAC_SHA256("WebAppData", botToken)
  // Note: Docs say "The secret key is the HMAC-SHA-256 signature of the bot token with the constant string WebAppData as the key."
  const secretKeyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode('WebAppData'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const secretKey = await crypto.subtle.sign(
    'HMAC', 
    secretKeyMaterial, 
    encoder.encode(botToken)
  );

  // 2. Calculate Signature: HMAC_SHA256(SecretKey, dataCheckString)
  const validationKey = await crypto.subtle.importKey(
    'raw',
    secretKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    validationKey,
    encoder.encode(dataCheckString)
  );

  // 3. Convert to Hex
  const hex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return hex === hash;
}

// ==========================================
// 2. Constants & Prompt
// ==========================================
const SYSTEM_PROMPT = `
You are a professional Real Estate SMM manager in Uzbekistan. 
Your task is to generate 3 distinct description formats based on the provided property details.

Formats:
1. Telegram: Engaging, emoji-rich, "Hot Sale" style. Use bold text for key features. Include contact triggers (Call now!).
2. Instagram: Short, punchy, Story-style. Focus on visual appeal and key stats. Use hashtags appropriate for Uzbekistan market (#tashkent #realestate #makler).
3. OLX: Professional, formal, structured. Clear list of characteristics. No excessive emojis. Trustworthy tone.

Language Rule: Detect the language of the user input (Uzbek or Russian) and generate the response in the SAME language.

Output JSON Format:
{
  "telegram": "...",
  "instagram": "...",
  "olx": "..."
}
`;

// ==========================================
// 3. Main Handler
// ==========================================
export default async function handler(request: Request) {
  // CORS Handling
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    // --- SECURITY CHECK 1: AUTHENTICATION ---
    const initData = request.headers.get('X-Telegram-Init-Data');
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!initData || !botToken) {
       // Allow dev bypass if explicitly set (optional, dangerous for prod)
       if (process.env.NODE_ENV === 'development') {
           console.warn('Dev mode: skipping auth');
       } else {
           return new Response(JSON.stringify({ error: 'Unauthorized: Missing Init Data' }), { status: 401 });
       }
    } else {
        const isValid = await validateTelegramWebAppData(initData, botToken);
        if (!isValid) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Invalid Signature' }), { status: 403 });
        }
    }

    // Parse User ID from Init Data
    const urlParams = new URLSearchParams(initData || '');
    const userJson = urlParams.get('user');
    const user = userJson ? JSON.parse(userJson) : null;
    const telegramId = user?.id ? String(user.id) : null;

    if (!telegramId && process.env.NODE_ENV !== 'development') {
         return new Response(JSON.stringify({ error: 'Unauthorized: No User ID' }), { status: 403 });
    }

    // --- SECURITY CHECK 2: RATE LIMITING (SUPABASE) ---
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL; // Handle both naming conventions
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // MUST use Service Role for Edge functions usually, strictly safe on server

    let canProceed = true;

    if (supabaseUrl && supabaseKey && telegramId) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Fetch user data
        const { data: userData, error: fetchError } = await supabase
            .from('users')
            .select('is_premium, daily_generations, max_daily_generations')
            .eq('telegram_id', telegramId)
            .single();

        if (userData && !fetchError) {
             // Check Limits
             if (userData.daily_generations >= userData.max_daily_generations) {
                 // Hard Stop
                 return new Response(JSON.stringify({ 
                     error: 'Daily limit reached. Upgrade to Pro for more!',
                     isLimitReached: true
                 }), { status: 429 });
             }

             // Increment Usage (Optimistic)
             const { error: rpcError } = await supabase.rpc('increment_daily_usage', { user_id: telegramId });
             
             if (rpcError) {
                 // Fallback if RPC missing
                 await supabase
                    .from('users')
                    .update({ daily_generations: userData.daily_generations + 1 })
                    .eq('telegram_id', telegramId);
             }
        }
    }

    // --- AI GENERATION ---
    const { rawInput, propertyDetails } = await request.json();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Server Config Error' }), { status: 500 });
    }

    // Construct the user prompt
    let userContent = '';
    if (rawInput) {
      userContent = `Raw Input: ${rawInput}`;
    } else if (propertyDetails) {
      userContent = `Property Details:\nTarget Type: ${propertyDetails.type}\nRooms: ${propertyDetails.rooms}\n...`; // Simplified for brevity
    } else {
        return new Response(JSON.stringify({ error: 'No input provided' }), { status: 400 });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'AI Provider Error');
    }

    const resultData = await response.json();
    const content = JSON.parse(resultData.choices[0].message.content);

    return new Response(JSON.stringify(content), {
      status: 200,
      headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
      },
    });

  } catch (error: any) {
    console.error('Edge Function Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
