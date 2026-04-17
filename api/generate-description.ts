import { createClient } from '@supabase/supabase-js';
import { validateTelegramWebAppData } from './lib/telegram-utils';

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
  language?: 'uz' | 'ru';
  tone?: 'expert' | 'emotional' | 'minimalist';
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

// ==========================================
// DeepSeek API Configuration
// ==========================================

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

// ... (system prompts remain same) ...

// DeepSeek API Types
interface DeepSeekResponse {
    choices: {
        message: {
            content: string;
        };
    }[];
}

// ==========================================
// In-Memory IP Rate Limit (DDOS Protection)
// ==========================================
const IP_LIMIT = 20; // Max requests per IP
const IP_WINDOW = 60 * 1000; // 1 minute window
const ipCache = new Map<string, { count: number, expires: number }>();

function isIpBlocked(ip: string): boolean {
    const now = Date.now();
    
    // Cleanup old entries periodically (lazy cleanup)
    if (ipCache.size > 1000) {
        for (const [key, value] of ipCache.entries()) {
            if (now > value.expires) ipCache.delete(key);
        }
    }

    const record = ipCache.get(ip);
    
    if (!record || now > record.expires) {
        ipCache.set(ip, { count: 1, expires: now + IP_WINDOW });
        return false;
    }
    
    if (record.count >= IP_LIMIT) {
        return true;
    }
    
    record.count++;
    return false;
}

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
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY?.trim();
    const googleApiKey = process.env.GOOGLE_API_KEY?.trim();

    if (!deepseekApiKey && !googleApiKey) {
      const error: ErrorResponse = { error: 'AI service not configured (Missing Keys)', code: 'API_KEY_MISSING' };
      return new Response(JSON.stringify(error), { status: 500, headers: corsHeaders });
    }

    // 0. DDOS Protection (IP based)
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (isIpBlocked(ip)) {
         return new Response(JSON.stringify({ error: 'Too many requests from this IP. Please wait.', code: 'IP_RATE_LIMIT' }), { status: 429, headers: corsHeaders });
    }

    // Auth
    const initData = request.headers.get('X-Telegram-Init-Data');
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const isDevelopment = process.env.NODE_ENV === 'development';
    let telegramId: string | null = null;

    if (initData && botToken) {
      const isValid = await validateTelegramWebAppData(initData, botToken);
      if (!isValid && !isDevelopment) {
        return new Response(JSON.stringify({ error: 'Invalid auth', code: 'AUTH_INVALID' }), { status: 403, headers: corsHeaders });
      }
      try {
        const urlParams = new URLSearchParams(initData);
        const userJson = urlParams.get('user');
        if (userJson) telegramId = String(JSON.parse(userJson).id);
      } catch {}
    } else if (!isDevelopment) {
      return new Response(JSON.stringify({ error: 'Auth required', code: 'AUTH_REQUIRED' }), { status: 401, headers: corsHeaders });
    }

    // Rate Limit
    if (telegramId) {
      const rateLimit = await checkAndIncrementUsage(telegramId);
      if (!rateLimit.allowed) {
        return new Response(JSON.stringify({ error: rateLimit.error, code: 'RATE_LIMIT_EXCEEDED' }), { status: 429, headers: corsHeaders });
      }
    }

    // Validation
    let requestBody;
    try {
        requestBody = await request.json();
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON', code: 'INVALID_REQUEST' }), { status: 400, headers: corsHeaders });
    }
    
    const validation = validateRequest(requestBody);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error, code: 'INVALID_REQUEST' }), { status: 400, headers: corsHeaders });
    }

    // Generation Logic
    // Generation Logic
    const targetLangName = language === 'ru' ? 'Russian' : 'Uzbek';
    const { rawInput, platform, previousText, instruction, tone = 'expert' } = validation.data;

    let systemPrompt = SYSTEM_PROMPTS[platform];
    systemPrompt += `\n\nCRITICAL RULE: The output MUST be in ${targetLangName} language.`;
    
    // Add Tone Specific Instructions
    if (tone === 'emotional') {
      systemPrompt += `\nTONE: Highly emotional, uses words like "Beautiful", "Dream home", "Perfect for family". Use more heart and home emojis.`;
    } else if (tone === 'minimalist') {
      systemPrompt += `\nTONE: Minimalist. Only key facts. No "marketing fluff". Very concise. Bullet points preferred.`;
    } else {
      systemPrompt += `\nTONE: Professional Real Estate Expert. Balanced and trustworthy.`;
    }

    // Construct Messages
    const messages = [
        { role: "system", content: systemPrompt },
    ];

    let userPrompt = "";
    if (previousText && instruction) {
        userPrompt = `Please rewrite the previous post with this instruction: "${instruction}". Keep the same format and platform style.\n\nPrevious Post:\n${previousText}`;
        messages.push({ role: "assistant", content: previousText });
        messages.push({ role: "user", content: `Please rewrite based on this: "${instruction}"` });
    } else {
        userPrompt = `Generate a property listing based on this info:\n\n${rawInput}`;
        messages.push({ role: "user", content: userPrompt });
    }

    let resultText = "";
    let errorDetails = "";

    // 1. Try DeepSeek (Primary)
    if (deepseekApiKey) {
        try {
            const response = await fetch(DEEPSEEK_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${deepseekApiKey}`
                },
                body: JSON.stringify({
                    model: DEEPSEEK_MODEL,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 2000,
                    stream: false
                }),
            });

            if (!response.ok) {
                 const err = await response.text();
                 throw new Error(`DeepSeek ${response.status}: ${err}`);
            }

            const data = await response.json() as DeepSeekResponse;
            resultText = data?.choices?.[0]?.message?.content || "";
        } catch (e: any) {
            console.warn('DeepSeek failed, switching to Gemini:', e.message);
            errorDetails += `DeepSeek: ${e.message}; `;
        }
    }

    // 2. Try Gemini (Backup) if DeepSeek failed or missing
    if (!resultText && googleApiKey) {
        try {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${googleApiKey}`;
            
            // Gemini expects "contents" array with parts
            const geminiPrompt = `${systemPrompt}\n\nUSER REQUEST:\n${userPrompt}`;
            
            const response = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: geminiPrompt }]
                    }]
                })
            });

            if (!response.ok) {
                 const err = await response.text();
                 throw new Error(`Gemini ${response.status}: ${err}`);
            }

            const data = await response.json();
            resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } catch (e: any) {
             console.error('Gemini Failed:', e.message);
             errorDetails += `Gemini: ${e.message}; `;
        }
    }

    if (!resultText) {
        throw new Error('All AI services failed. ' + errorDetails);
    }

    return new Response(JSON.stringify({ text: resultText.trim() }), { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error('API Error:', error);
    const code = error.message?.includes('AI services failed') ? 'AI_SERVICE_ERROR' : 'INTERNAL_ERROR';
    return new Response(JSON.stringify({ error: error.message || 'Internal Error', code }), { status: 500, headers: corsHeaders });
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

// Logic moved to shared lib

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

  const { rawInput, platform, previousText, instruction, language } = body;

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
      instruction,
      language: language as 'uz' | 'ru' || 'uz'
    } 
  };
}

// ==========================================
// Main Handler
// ==========================================


