import type { PropertyDetails, GeneratedDescriptions, Platform } from '@/types';

// ===================================
// AI Description Service
// ===================================

const API_ENDPOINT = '/api/generate-description';

export async function generateDescriptions(
  details: PropertyDetails
): Promise<GeneratedDescriptions> {
  try {
    const initData = (window as any).Telegram?.WebApp?.initData || '';
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout (Vercel Edge limit is generous, but we want UI feedback)

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': initData
        },
        body: JSON.stringify(details),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to generate descriptions');
      }

      return await response.json();
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timed out. Please try again.');
        }
        throw error;
    }
  } catch (error) {
    console.error('AI generation error:', error);
    // Fallback to local template generation
    return generateLocalDescriptions(details);
  }
}

// ===================================
// Simple Single Platform Generator
// ===================================

export async function generateDescription(
  rawInput: string,
  platform: 'telegram' | 'instagram' | 'olx'
): Promise<string> {
  const results = await generateDescriptions({ rawInput } as any);
  return results[platform];
}

// ===================================
// Local Template-Based Generation (Fallback)
// ===================================

function generateLocalDescriptions(details: PropertyDetails | { rawInput: string }): GeneratedDescriptions {
  // Handle Raw Input Fallback
  if ('rawInput' in details && details.rawInput) {
    const raw = details.rawInput;
    return {
      telegram: `🔥 **Срочное предложение!**\n\n${raw}\n\n📞 Звоните сейчас!`,
      instagram: `📍 Новое поступление!\n\n${raw}\n\n#недвижимость`,
      olx: `Продается недвижимость.\n\n${raw}\n\nПодробности по телефону.`,
    };
  }
  
  // Cast to full details for structural generation
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
  const featuresText = features.length > 0 ? features.join(', ') : '';

  // Telegram format (can use Markdown)
  const telegram = `
${typeLabel}

📍 **${location}**

🛏 Комнат: ${rooms}
📐 Площадь: ${area} м²
${floorInfo ? `🏗 Этаж: ${floorInfo}` : ''}

💰 **Цена: ${priceFormatted} ${currency}**

${featuresText ? `✨ Особенности:\n${features.map(f => `• ${f}`).join('\n')}` : ''}

${description ? `📝 ${description}` : ''}

📞 Связаться с риелтором 👇
`.trim();

  // Instagram format (clean, with emojis but no markdown)
  const instagram = `
${typeLabel.split(' ')[0]} ${rooms}-комнатная ${type === 'apartment' ? 'квартира' : type === 'house' ? 'дом' : 'недвижимость'}

📍 ${location}
📐 ${area} м² ${floorInfo ? `| ${floorInfo}` : ''}
💰 ${priceFormatted} ${currency}

${features.slice(0, 5).map(f => `✓ ${f}`).join('\n')}

${description ? description.slice(0, 200) + (description.length > 200 ? '...' : '') : ''}

🔥 Подробности в директ!

#недвижимость #продажа #${type} #${location.split(',')[0].replace(/\s/g, '')} #риелтор #maklerPro
`.trim();

  // OLX format (structured, formal)
  const olx = `
${rooms}-комнатная ${type === 'apartment' ? 'квартира' : type === 'house' ? 'дом' : 'недвижимость'} - ${location}

Основные характеристики:
• Количество комнат: ${rooms}
• Общая площадь: ${area} м²
${floorInfo ? `• Этаж: ${floorInfo}` : ''}

${features.length > 0 ? `Дополнительно:\n${features.map(f => `• ${f}`).join('\n')}` : ''}

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
  } catch (error) {
    // Fallback for older browsers
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
