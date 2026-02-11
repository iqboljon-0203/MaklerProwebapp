import { supabase } from '@/lib/supabase';

// ===================================
// Types
// ===================================

export type SharePlatform = 'telegram' | 'olx' | 'instagram' | 'copy';

export interface ShareResult {
  success: boolean;
  error?: string;
}

export interface CopyResult {
  success: boolean;
  method: 'clipboard' | 'execCommand' | 'fallback';
  error?: string;
}

// ===================================
// Clipboard Utility
// ===================================

/**
 * Robust clipboard copy function with multiple fallbacks
 */
export async function copyToClipboard(text: string): Promise<CopyResult> {
  // Method 1: Modern Clipboard API
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return { success: true, method: 'clipboard' };
    } catch (error) {
      console.warn('Clipboard API failed, trying fallback:', error);
    }
  }

  // Method 2: execCommand fallback (for older browsers)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Prevent scrolling
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.style.opacity = '0';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (success) {
      return { success: true, method: 'execCommand' };
    }
  } catch (error) {
    console.warn('execCommand fallback failed:', error);
  }

  // Method 3: Manual selection (last resort)
  try {
    const range = document.createRange();
    const selection = window.getSelection();
    
    const span = document.createElement('span');
    span.textContent = text;
    span.style.position = 'fixed';
    span.style.left = '-999999px';
    span.style.userSelect = 'all';
    
    document.body.appendChild(span);
    range.selectNodeContents(span);
    selection?.removeAllRanges();
    selection?.addRange(range);
    
    const success = document.execCommand('copy');
    document.body.removeChild(span);
    
    if (success) {
      return { success: true, method: 'fallback' };
    }
  } catch (error) {
    console.warn('Manual selection fallback failed:', error);
  }

  return { 
    success: false, 
    method: 'fallback',
    error: 'Nusxa olish imkoni bo\'lmadi' 
  };
}

// ===================================
// Telegram Deep Link
// ===================================

const TELEGRAM_SHARE_URL = 'https://t.me/share/url';
const TELEGRAM_MSG_URL = 'tg://msg_url';

/**
 * Checks if running inside Telegram Mini App
 */
function isTelegramMiniApp(): boolean {
  return !!(window as any).Telegram?.WebApp;
}

/**
 * Get Telegram WebApp instance
 */
function getTelegramWebApp(): any {
  return (window as any).Telegram?.WebApp;
}

/**
 * Share text to Telegram
 */
export function shareToTelegram(text: string, url?: string): ShareResult {
  try {
    const webApp = getTelegramWebApp();
    
    // Encode text for URL
    const encodedText = encodeURIComponent(text);
    const encodedUrl = url ? encodeURIComponent(url) : '';
    
    // Build share URL
    let shareUrl: string;
    
    if (url) {
      shareUrl = `${TELEGRAM_SHARE_URL}?url=${encodedUrl}&text=${encodedText}`;
    } else {
      // For text-only sharing, use tg://msg protocol
      shareUrl = `${TELEGRAM_MSG_URL}?text=${encodedText}`;
    }
    
    // Open link using appropriate method
    if (isTelegramMiniApp() && webApp?.openLink) {
      // Inside Telegram Mini App - use openLink for external URLs
      webApp.openLink(shareUrl);
    } else if (isTelegramMiniApp() && webApp?.openTelegramLink) {
      // For t.me links, use openTelegramLink
      webApp.openTelegramLink(shareUrl);
    } else {
      // Regular browser - open in new tab
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Telegram share error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Telegram ulashishda xatolik' 
    };
  }
}

// ===================================
// OLX Deep Link
// ===================================

const OLX_NEW_AD_URL = 'https://www.olx.uz/d/obyavlenie/dobavit/';

/**
 * Share to OLX (copies text and redirects)
 */
export async function shareToOLX(text: string): Promise<ShareResult> {
  try {
    // First, copy text to clipboard
    const copyResult = await copyToClipboard(text);
    
    if (!copyResult.success) {
      return { 
        success: false, 
        error: 'Matn nusxa olinmadi' 
      };
    }
    
    // Redirect to OLX after a short delay
    setTimeout(() => {
      if (isTelegramMiniApp()) {
        const webApp = getTelegramWebApp();
        webApp?.openLink(OLX_NEW_AD_URL);
      } else {
        window.open(OLX_NEW_AD_URL, '_blank', 'noopener,noreferrer');
      }
    }, 500);
    
    return { success: true };
    
  } catch (error) {
    console.error('OLX share error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'OLX ga ulashishda xatolik' 
    };
  }
}

// ===================================
// Instagram (Copy for Stories/Bio)
// ===================================

export async function shareToInstagram(text: string): Promise<ShareResult> {
  try {
    const copyResult = await copyToClipboard(text);
    
    if (!copyResult.success) {
      return { success: false, error: 'Matn nusxa olinmadi' };
    }
    
    // Instagram doesn't support deep linking for text
    // Just inform user to paste in Instagram
    return { success: true };
    
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Instagram uchun nusxa olishda xatolik' 
    };
  }
}

// ===================================
// Native Share API (Mobile)
// ===================================

/**
 * Use native share API if available
 */
export async function nativeShare(
  title: string, 
  text: string, 
  url?: string
): Promise<ShareResult> {
  if (!navigator.share) {
    return { success: false, error: 'Native share not supported' };
  }
  
  try {
    await navigator.share({
      title,
      text,
      url,
    });
    return { success: true };
  } catch (error) {
    // User cancelled or error
    if ((error as Error).name === 'AbortError') {
      return { success: false, error: 'User cancelled' };
    }
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Share failed' 
    };
  }
}

// ===================================
// Analytics: Track Share Platform
// ===================================

export async function trackShareEvent(
  telegramId: string,
  platform: SharePlatform,
  success: boolean
): Promise<void> {
  if (!supabase) return;
  
  try {
    // Insert share event
    await supabase
      .from('share_analytics')
      .insert({
        telegram_id: telegramId,
        platform,
        success,
        created_at: new Date().toISOString(),
      });
    
    // Update user's share count via RPC
    await supabase.rpc('increment_share_count', {
      p_telegram_id: telegramId,
      p_platform: platform,
    });
    
  } catch (error) {
    // Silent fail - analytics shouldn't break the app
    console.warn('Failed to track share event:', error);
  }
}

// ===================================
// Get Share Statistics
// ===================================

export async function getShareStats(telegramId: string): Promise<{
  telegram: number;
  olx: number;
  instagram: number;
  copy: number;
} | null> {
  if (!supabase) return null;
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('telegram_shares, olx_shares, instagram_shares, copy_shares')
      .eq('telegram_id', telegramId)
      .single();
    
    if (error) throw error;
    
    return {
      telegram: data.telegram_shares || 0,
      olx: data.olx_shares || 0,
      instagram: data.instagram_shares || 0,
      copy: data.copy_shares || 0,
    };
  } catch (error) {
    console.error('Failed to get share stats:', error);
    return null;
  }
}

// ===================================
// Haptic Feedback Helper
// ===================================

export function triggerHapticFeedback(type: 'success' | 'error' | 'warning' = 'success'): void {
  try {
    const webApp = getTelegramWebApp();
    if (webApp?.HapticFeedback) {
      webApp.HapticFeedback.notificationOccurred(type);
    }
  } catch {
    // Ignore haptic errors
  }
}
