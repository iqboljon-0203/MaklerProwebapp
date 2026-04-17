import type { PropertyDetails, GeneratedDescriptions, Platform } from '@/types';
import { useUserStore } from '@/store';

// ===================================
// AI Description Service
// ===================================

const API_ENDPOINT = '/api/generate-description';
const REQUEST_TIMEOUT = 30000;
const MAX_FREE_GENERATIONS = 5;

// ===================================
// Custom Error Types
// ===================================

export class LimitExceededError extends Error {
  readonly code = 'LIMIT_EXCEEDED' as const;
  readonly remainingGenerations: number;
  
  constructor(message: string, remainingGenerations: number = 0) {
    super(message);
    this.name = 'LimitExceededError';
    this.remainingGenerations = remainingGenerations;
  }
}

export class AIServiceError extends Error {
  readonly code: string;
  
  constructor(message: string, code: string = 'AI_ERROR') {
    super(message);
    this.name = 'AIServiceError';
    this.code = code;
  }
}

export class NetworkError extends Error {
  readonly code = 'NETWORK_ERROR' as const;
  
  constructor(message: string = 'Tarmoq xatosi. Internet aloqasini tekshiring.') {
    super(message);
    this.name = 'NetworkError';
  }
}

// ===================================
// Response Types
// ===================================

interface APISuccessResponse {
  text: string;
}

interface APIErrorResponse {
  error: string;
  code?: string;
}

// ===================================
// Result Type (for type-safe error handling)
// ===================================

export type GenerationResult = 
  | { success: true; text: string }
  | { success: false; error: LimitExceededError | AIServiceError | NetworkError };

// ===================================
// Limit Validation
// ===================================

interface LimitCheckResult {
  canGenerate: boolean;
  isPremium: boolean;
  dailyGenerations: number;
  remainingGenerations: number;
}

function checkUserLimit(): LimitCheckResult {
  const { user } = useUserStore.getState();
  
  const isPremium = user.isPremium;
  const dailyGenerations = user.dailyGenerations;
  const maxGenerations = user.maxDailyGenerations || MAX_FREE_GENERATIONS;
  const remainingGenerations = Math.max(0, maxGenerations - dailyGenerations);
  
  // Premium users have unlimited access
  if (isPremium) {
    return {
      canGenerate: true,
      isPremium: true,
      dailyGenerations,
      remainingGenerations: Infinity
    };
  }
  
  // Free users have daily limit
  const canGenerate = dailyGenerations < maxGenerations;
  
  return {
    canGenerate,
    isPremium: false,
    dailyGenerations,
    remainingGenerations
  };
}

// ===================================
// Increment Local Usage Counter
// ===================================

function incrementLocalUsage(): void {
  const { user, setUser } = useUserStore.getState();
  
  // Don't increment for premium users
  if (user.isPremium) return;
  
  setUser({
    dailyGenerations: user.dailyGenerations + 1
  });
}

// ===================================
// Single Platform Generator (DeepSeek API)
// ===================================

export async function generateDescription(
  rawInput: string,
  platform: Platform,
  options?: { previousText?: string; instruction?: string; language?: 'uz' | 'ru' }
): Promise<string> {
  // 1. CHECK LIMIT BEFORE API CALL
  const limitCheck = checkUserLimit();
  
  if (!limitCheck.canGenerate) {
    throw new LimitExceededError(
      `Kunlik limit tugadi (${MAX_FREE_GENERATIONS}/${MAX_FREE_GENERATIONS}). Premium ga o'ting cheksiz foydalanish uchun!`,
      limitCheck.remainingGenerations
    );
  }
  
  // 2. PREPARE REQUEST
  const initData = (window as any).Telegram?.WebApp?.initData || '';
  
    let attempt = 0;
    const maxRetries = 2; // Total 3 attempts (1 initial + 2 retries)

    while (attempt <= maxRetries) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      try {
        // 3. MAKE API REQUEST
        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': initData
          },
          body: JSON.stringify({ 
            rawInput, 
            platform,
            previousText: options?.previousText,
            instruction: options?.instruction,
            language: options?.language
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        // 4. HANDLE ERROR RESPONSES (Check this before parsing JSON)
        if (!response.ok) {
          // DEV MOCK FALLBACK (If API is missing locally)
          if (import.meta.env.DEV && response.status === 404) {
             console.log('🧪 API missing in DEV, using local mock response...');
             await new Promise(r => setTimeout(r, 1000));
             
             const isRu = options?.language === 'ru';
             const mockResponses: Record<string, string> = {
                 telegram: isRu 
                     ? `🔥 **ОТЛИЧНОЕ ПРЕДЛОЖЕНИЕ!**\n\n🏠 Объект: ${rawInput.substring(0, 30)}...\n\n✅ Сделан качественный ремонт\n✅ Отличная локация\n\n📞 Звоните: +998 (XX) XXX-XX-XX`
                     : `🔥 **AJOYIB TAKLIF!**\n\n🏠 O'byekt: ${rawInput.substring(0, 30)}...\n\n✅ Sifatli ta'mirlangan\n✅ Zo'r lokatsiya\n\n📞 Tel: +998 (XX) XXX-XX-XX`,
                 instagram: `🏡 Dream Home ✨\n\nCheck out: ${rawInput.substring(0, 20)}...\n\nDM for details! 📥 #realestate`,
                 olx: isRu ? `Продается недвижимость.\n${rawInput}` : `Ko'chmas mulk sotiladi.\n${rawInput}`
             };
             
             incrementLocalUsage();
             return mockResponses[platform] || "Mock content...";
          }

          // Try to parse error data if possible
          const errorData = await response.json().catch(() => ({ error: 'AI xizmatida xatolik', code: 'API_ERROR' }));
          
          if (errorData.code === 'RATE_LIMIT_EXCEEDED') {
            throw new LimitExceededError(errorData.error || 'Kunlik limit tugadi', 0);
          }
          
          if (response.status >= 500) {
             throw new Error("Server error, retrying...");
          }

          throw new AIServiceError(errorData.error || 'AI xizmatida xatolik', errorData.code || 'API_ERROR');
        }

        // 5. PARSE SUCCESS RESPONSE
        let data: APISuccessResponse;
        try {
          data = await response.json();
        } catch {
          throw new AIServiceError('Invalid response from server', 'PARSE_ERROR');
        }

        // 6. SUCCESS
        incrementLocalUsage();
        return data.text;

      } catch (error: unknown) {
        clearTimeout(timeoutId);
        
        // Don't retry these errors
        if (error instanceof LimitExceededError || error instanceof AIServiceError) {
          throw error;
        }

        const isNetworkOrTimeout = 
           (error instanceof Error && error.name === 'AbortError') || 
           (error instanceof TypeError && error.message.includes('fetch')) ||
           (error instanceof Error && error.message.includes('Server error'));

        if (isNetworkOrTimeout && attempt < maxRetries) {
          attempt++;
          // Exponential backoff: 1s, 2s
          await new Promise(res => setTimeout(res, Math.pow(2, attempt - 1) * 1000));
          continue;
        }

        // Out of retries or other error
        if (error instanceof Error && error.name === 'AbortError') {
          throw new NetworkError('Sorov vaqti tugadi (Timeout). Iltimos qaytadan urinib koring.');
        }
        if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new NetworkError('Serverga ulanib bolmadi. Internet aloqasini tekshiring.');
        }
        
        const message = error instanceof Error ? error.message : 'Noma\'lum xatolik';
        throw new AIServiceError(message, 'UNKNOWN_ERROR');
      }
    }
    
    throw new AIServiceError('Maksimal urinishlar tugadi', 'RETRY_FAILED');
}

// ===================================
// Safe Generator (Returns Result Object)
// ===================================

export async function generateDescriptionSafe(
  rawInput: string,
  platform: Platform
): Promise<GenerationResult> {
  try {
    const text = await generateDescription(rawInput, platform);
    return { success: true, text };
  } catch (error) {
    if (error instanceof LimitExceededError) {
      return { success: false, error };
    }
    if (error instanceof AIServiceError) {
      return { success: false, error };
    }
    if (error instanceof NetworkError) {
      return { success: false, error };
    }
    return { 
      success: false, 
      error: new AIServiceError('Noma\'lum xatolik', 'UNKNOWN_ERROR') 
    };
  }
}

// ===================================
// Multi-Platform Generator (Legacy Support)
// ===================================

export async function generateDescriptions(
  details: PropertyDetails | { rawInput: string }
): Promise<GeneratedDescriptions> {
  // Check limit once before any requests
  const limitCheck = checkUserLimit();
  
  if (!limitCheck.canGenerate) {
    throw new LimitExceededError(
      `Kunlik limit tugadi. Premium ga o'ting!`,
      limitCheck.remainingGenerations
    );
  }
  
  try {
    const rawInput: string = ('rawInput' in details && details.rawInput) 
      ? details.rawInput 
      : JSON.stringify(details);
    
    const [telegram, instagram, olx] = await Promise.all([
      generateDescription(rawInput, 'telegram').catch(() => generateLocalFallback(rawInput, 'telegram')),
      generateDescription(rawInput, 'instagram').catch(() => generateLocalFallback(rawInput, 'instagram')),
      generateDescription(rawInput, 'olx').catch(() => generateLocalFallback(rawInput, 'olx')),
    ]);

    return { telegram, instagram, olx };
  } catch (error) {
    // Re-throw limit errors
    if (error instanceof LimitExceededError) throw error;
    
    console.error('AI generation error:', error);
    return generateLocalDescriptions(details);
  }
}

// ===================================
// Get Current Usage Status
// ===================================

export function getUsageStatus(): LimitCheckResult {
  return checkUserLimit();
}

// ===================================
// Local Fallback for Single Platform
// ===================================

function generateLocalFallback(rawInput: string, platform: Platform): string {
  const fallbacks: Record<Platform, string> = {
    telegram: `🔥 **Yangi taklif!**\n\n${rawInput}\n\n📞 Hoziroq qongiroq qiling!`,
    instagram: `📍 Yangi elon!\n\n${rawInput}\n\n#kochmasmulk #toshkent #makler`,
    olx: `Kochmas mulk sotiladi.\n\n${rawInput}\n\nBatafsil malumot uchun boglaning.`,
  };
  return fallbacks[platform];
}

// ===================================
// Local Template-Based Generation (Fallback)
// ===================================

function generateLocalDescriptions(details: PropertyDetails | { rawInput: string }): GeneratedDescriptions {
  if ('rawInput' in details && details.rawInput) {
    const raw = details.rawInput;
    return {
      telegram: `🔥 **Срочное предложение!**\n\n${raw}\n\n📞 Звоните сейчас!`,
      instagram: `📍 Новое поступление!\n\n${raw}\n\n#недвижимость`,
      olx: `Продается недвижимость.\n\n${raw}\n\nПодробности по телефону.`,
    };
  }
  
  const d = details as PropertyDetails;

  const {
    type,
    rooms,
    area,
    floor,
    totalFloors,
    price,
    currency,
    location,
    features,
    description,
  } = d;

  const propertyTypeLabels: Record<string, string> = {
    apartment: '🏢 Квартира',
    house: '🏠 Дом',
    office: '🏛️ Офис',
    land: '🌳 Участок',
    commercial: '🏪 Коммерческая недвижимость',
  };

  const typeLabel = propertyTypeLabels[type] || '🏠 Недвижимость';
  const priceFormatted = new Intl.NumberFormat('ru-RU').format(price);
  const floorInfo = floor && totalFloors ? `${floor}/${totalFloors} этаж` : '';

  const telegram = `
${typeLabel}

📍 **${location}**

🛏 Комнат: ${rooms}
📐 Площадь: ${area} м²
${floorInfo ? `🏗 Этаж: ${floorInfo}` : ''}

💰 **Цена: ${priceFormatted} ${currency}**

${features?.length > 0 ? `✨ Особенности:\n${features.map(f => `• ${f}`).join('\n')}` : ''}

${description ? `📝 ${description}` : ''}

📞 Связаться с риелтором 👇
`.trim();

  const instagram = `
${typeLabel.split(' ')[0]} ${rooms}-комнатная ${type === 'apartment' ? 'квартира' : type === 'house' ? 'дом' : 'недвижимость'}

📍 ${location}
📐 ${area} м² ${floorInfo ? `| ${floorInfo}` : ''}
💰 ${priceFormatted} ${currency}

${features?.slice(0, 5).map(f => `✓ ${f}`).join('\n') || ''}

${description ? description.slice(0, 200) + (description.length > 200 ? '...' : '') : ''}

🔥 Подробности в директ!

#недвижимость #продажа #${type} #${location.split(',')[0].replace(/\s/g, '')} #риелтор #maklerPro
`.trim();

  const olx = `
${rooms}-комнатная ${type === 'apartment' ? 'квартира' : type === 'house' ? 'дом' : 'недвижимость'} - ${location}

Основные характеристики:
• Количество комнат: ${rooms}
• Общая площадь: ${area} м²
${floorInfo ? `• Этаж: ${floorInfo}` : ''}

${features?.length > 0 ? `Дополнительно:\n${features.map(f => `• ${f}`).join('\n')}` : ''}

${description ? `\nОписание:\n${description}` : ''}

Цена: ${priceFormatted} ${currency}

Обращайтесь по указанным контактам для получения дополнительной информации или организации просмотра.
`.trim();

  return { telegram, instagram, olx };
}

// ===================================
// Copy to Clipboard
// ===================================

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      document.body.removeChild(textarea);
      return false;
    }
  }
}

// ===================================
// Platform Sharing
// ===================================

export function shareToTelegram(text: string): void {
  const encodedText = encodeURIComponent(text);
  window.open(`https://t.me/share/url?text=${encodedText}`, '_blank');
}

export function shareToWhatsApp(text: string): void {
  const encodedText = encodeURIComponent(text);
  window.open(`https://wa.me/?text=${encodedText}`, '_blank');
}

export function getCharacterCount(text: string): number {
  return text.length;
}

export function getPlatformLimits(platform: Platform): { max: number; recommended: number } {
  const limits = {
    telegram: { max: 4096, recommended: 1000 },
    instagram: { max: 2200, recommended: 800 },
    olx: { max: 9000, recommended: 2000 },
  };
  return limits[platform];
}
