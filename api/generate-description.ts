import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

// ==========================================
// Types
// ==========================================

type Platform = 'telegram' | 'instagram' | 'olx';

interface GenerationRequest {
  rawInput: string;
  platform: Platform;
  previousText?: string; // Optional: For refinement
  instruction?: string;  // Optional: User's refinement instruction
}

interface GenerationResponse {
  text: string;
}

interface ErrorResponse {
  error: string;
  code?: string;
}

// ==========================================
// Google Gemini API Configuration (Free Tier)
// ==========================================

// Google Gemini API Configuration (Free Tier)
// ==========================================

// Google Gemini API Configuration (Free Tier)
// ==========================================

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-001:generateContent';

// ... (system prompts remain same) ...

// Main Handler Update
export default async function handler(request: Request): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    const error: ErrorResponse = { error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' };
    return new Response(JSON.stringify(error), { status: 405, headers: corsHeaders });
  }

  try {
    const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
    if (!geminiApiKey) {
      const error: ErrorResponse = { error: 'Al service not configured (Missing Gemini Key)', code: 'API_KEY_MISSING' };
      return new Response(JSON.stringify(error), { status: 500, headers: corsHeaders });
    }

    // Auth
    const initData = request.headers.get('X-Telegram-Init-Data');
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const isDevelopment = process.env.NODE_ENV === 'development';
    let telegramId: string | null = null;

    if (initData && botToken) {
      const isValid = await validateTelegramWebAppData(initData, botToken);
      if (!isValid && !isDevelopment) {
        return new Response(JSON.stringify({ error: 'Invalid auth' }), { status: 403, headers: corsHeaders });
      }
      try {
        const urlParams = new URLSearchParams(initData);
        const userJson = urlParams.get('user');
        if (userJson) telegramId = String(JSON.parse(userJson).id);
      } catch {}
    } else if (!isDevelopment) {
      return new Response(JSON.stringify({ error: 'Auth required' }), { status: 401, headers: corsHeaders });
    }

    // Rate Limit
    if (telegramId) {
      const rateLimit = await checkAndIncrementUsage(telegramId);
      if (!rateLimit.allowed) {
        return new Response(JSON.stringify({ error: rateLimit.error }), { status: 429, headers: corsHeaders });
      }
    }

    // Validation
    let requestBody;
    try {
        requestBody = await request.json();
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders });
    }
    
    const validation = validateRequest(requestBody);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), { status: 400, headers: corsHeaders });
    }

    // Generation Logic
    const { rawInput, platform, previousText, instruction } = validation.data;
    const systemPrompt = SYSTEM_PROMPTS[platform];
    
    // Construct Gemini Prompt
    let fullPrompt = `${systemPrompt}\n\n`;
    
    if (previousText && instruction) {
        fullPrompt += `PREVIOUS TEXT:\n${previousText}\n\n`;
        fullPrompt += `USER INSTRUCTION: Please rewrite the above post with this instruction: "${instruction}". Keep the same format and platform style.`;
    } else {
        fullPrompt += `USER REQUEST: Generate a ${platform.toUpperCase()} description for the following property:\n\n${rawInput}`;
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: fullPrompt }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2000,
            }
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini Error:', errorText);
        
        let errorMessage = `Gemini API Error: ${response.status}`;
        try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.error && errorJson.error.message) {
                errorMessage += ` - ${errorJson.error.message}`;
            }
        } catch {
            errorMessage += ` - ${errorText.substring(0, 100)}`;
        }
        
        throw new Error(errorMessage);
    }

    const data = await response.json();
    const text = (data as any)?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error('Empty response from AI');

    return new Response(JSON.stringify({ text: text.trim() }), { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Error' }), { status: 500, headers: corsHeaders });
  }
}

const SYSTEM_PROMPTS: Record<Platform, string> = {
  telegram: `You are an expert Real Estate Marketing Specialist in Uzbekistan with 15+ years of experience.

Your task: Generate a compelling Telegram post for a property listing.

STYLE GUIDELINES:
- Use emotional triggers and urgency (🔥 HOT DEAL!, ⚡️ СРОЧНО!, 💎 ЭКСКЛЮЗИВ!)
- Rich emoji usage throughout the text (minimum 8-10 emojis)
- Clean Markdown formatting (**bold** for key features, headers)
- Create FOMO (Fear Of Missing Out) effect
- Include strong call-to-action at the end
- Personal touch ("Я лично проверил этот объект...")

STRUCTURE:
1. Attention-grabbing headline with emojis
2. Key property highlights (area, rooms, floor) — **bold**
3. Emotional benefits (close to metro, quiet neighborhood, etc.)
4. Price with urgency element
5. CTA: "📞 Звоните прямо сейчас!" or "✍️ Пишите в ЛС!"

LANGUAGE RULE: Detect input language (Uzbek/Russian) and respond in the SAME language.

Output ONLY the formatted post text. No explanations.`,

  instagram: `You are a top-tier Real Estate Social Media Manager specializing in Instagram content.

Your task: Generate a viral Instagram caption for a property listing.

STYLE GUIDELINES:
- Short, punchy sentences (max 2-3 lines per paragraph)
- Visual storytelling approach
- Modern, trendy tone (like a lifestyle influencer)
- Strategic emoji placement (not overwhelming, 5-7 total)
- Engaging question at the start or middle
- Relevant hashtags at the end (10-15 hashtags)

STRUCTURE:
1. Hook question or statement (first line is CRUCIAL)
2. Key property highlights (2-3 bullet points or short lines)
3. Lifestyle benefit ("Представьте: вы просыпаетесь...")
4. Price mention (optional, can create curiosity)
5. CTA: "Ссылка в био" or "Пишите в Директ 📩"
6. Hashtag block: #недвижимость #ташкент #квартира #makler #realestate #tashkent #uzbekistan etc.

LANGUAGE RULE: Detect input language (Uzbek/Russian) and respond in the SAME language.

Output ONLY the Instagram caption. No explanations.`,

  olx: `You are a professional Real Estate Agent creating OLX/classified listings in Uzbekistan.

Your task: Generate a formal, structured OLX property description.

STYLE GUIDELINES:
- Professional and trustworthy tone
- Technical and factual focus
- No excessive emojis (maximum 2-3 for visual breaks)
- Clear, scannable structure with bullet points
- Complete property specifications
- Formal language, no slang

STRUCTURE:
99. Clear title line with property type and location
100. "Основные характеристики:" section
   • Количество комнат: X
   • Общая площадь: X м²
   • Этаж: X из Y
   • Состояние: евроремонт/требует ремонта/etc.
3. "Расположение:" section (district, landmarks, metro)
4. "Дополнительно:" section (parking, furniture, etc.)
5. "Описание:" free-form paragraph about unique features
6. Price line
7. Contact invitation (formal)

LANGUAGE RULE: Detect input language (Uzbek/Russian) and respond in the SAME language.

Output ONLY the OLX listing text. No explanations.`
};

// ==========================================
// Telegram WebApp Validation (Web Crypto API)
// ==========================================

async function validateTelegramWebAppData(
  telegramInitData: string, 
  botToken: string
): Promise<boolean> {
  try {
    const urlParams = new URLSearchParams(telegramInitData);
    const hash = urlParams.get('hash');
    if (!hash) return false;

    urlParams.delete('hash');
    
    const params: string[] = [];
    urlParams.forEach((value, key) => params.push(`${key}=${value}`));
    params.sort();
    
    const dataCheckString = params.join('\n');
    const encoder = new TextEncoder();

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

    const hex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return hex === hash;
  } catch {
    return false;
  }
}

// ==========================================
// Rate Limiting with Supabase
// ==========================================

async function checkAndIncrementUsage(telegramId: string): Promise<{ allowed: boolean; error?: string }> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase not configured, skipping rate limit check');
    return { allowed: true };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('is_premium, daily_generations, max_daily_generations')
      .eq('telegram_id', telegramId)
      .single();

    if (fetchError || !userData) {
      return { allowed: true };
    }

    if (userData.is_premium) {
      return { allowed: true };
    }

    if (userData.daily_generations >= userData.max_daily_generations) {
      return { 
        allowed: false, 
        error: 'Kunlik limit tugadi. PRO ga o\'ting cheksiz foydalanish uchun!' 
      };
    }

    const { error: rpcError } = await supabase.rpc('increment_daily_usage', { user_id: telegramId });
    
    if (rpcError) {
      await supabase
        .from('users')
        .update({ daily_generations: userData.daily_generations + 1 })
        .eq('telegram_id', telegramId);
    }

    return { allowed: true };
  } catch (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true };
  }
}

// ==========================================
// Request Validation
// ==========================================

function validateRequest(body: any): { valid: true; data: GenerationRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const { rawInput, platform, previousText, instruction } = body;

  if (!rawInput && !previousText) {
      return { valid: false, error: 'Either rawInput or previousText is required' };
  }

  if (!platform || !['telegram', 'instagram', 'olx'].includes(platform)) {
    return { valid: false, error: 'platform must be one of: telegram, instagram, olx' };
  }

  return { 
    valid: true, 
    data: { 
      rawInput: rawInput || "", 
      platform: platform as Platform,
      previousText,
      instruction
    } 
  };
}

// ==========================================
// Main Handler
// ==========================================


