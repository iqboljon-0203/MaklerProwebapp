import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store';
import type { 
  CustomWatermarkSettings, 
  UserBrandingProfile,
  WatermarkPosition 
} from '@/types';

// ===================================
// Types
// ===================================

export interface WatermarkUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface BrandingUpdateResult {
  success: boolean;
  error?: string;
}

// ===================================
// Constants
// ===================================

const WATERMARKS_BUCKET = 'watermarks';
const MAX_WATERMARK_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/png', 'image/webp'];

const DEFAULT_WATERMARK_SETTINGS: CustomWatermarkSettings = {
  type: 'text',
  position: 'bottom-right',
  opacity: 0.8,
  scale: 15,
  enabled: true,
  padding: 20,
};

// ===================================
// Upload Custom Watermark Logo
// ===================================

export async function uploadWatermarkLogo(
  telegramId: string,
  file: File
): Promise<WatermarkUploadResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { 
      success: false, 
      error: 'Faqat PNG yoki WebP formatlar qabul qilinadi' 
    };
  }

  // Validate file size
  if (file.size > MAX_WATERMARK_SIZE) {
    return { 
      success: false, 
      error: 'Fayl hajmi 5MB dan oshmasligi kerak' 
    };
  }

  try {
    // Generate unique filename
    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `${telegramId}/logo_${Date.now()}.${fileExt}`;

    // Delete old watermark if exists
    await deleteExistingWatermark(telegramId);

    // Upload new watermark
    const { error: uploadError } = await supabase
      .storage
      .from(WATERMARKS_BUCKET)
      .upload(fileName, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from(WATERMARKS_BUCKET)
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Update user record in database
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        custom_watermark_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('telegram_id', telegramId);

    if (updateError) {
      throw updateError;
    }

    return { success: true, url: publicUrl };

  } catch (error) {
    console.error('Watermark upload error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Upload failed' 
    };
  }
}

// ===================================
// Delete Existing Watermark
// ===================================

async function deleteExistingWatermark(telegramId: string): Promise<void> {
  if (!supabase) return;

  try {
    // List files in user's folder
    const { data: files } = await supabase
      .storage
      .from(WATERMARKS_BUCKET)
      .list(telegramId);

    if (files && files.length > 0) {
      const filePaths = files.map(f => `${telegramId}/${f.name}`);
      await supabase
        .storage
        .from(WATERMARKS_BUCKET)
        .remove(filePaths);
    }
  } catch (error) {
    console.warn('Error deleting old watermark:', error);
  }
}

// ===================================
// Delete Watermark Logo
// ===================================

export async function deleteWatermarkLogo(
  telegramId: string
): Promise<BrandingUpdateResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // Delete from storage
    await deleteExistingWatermark(telegramId);

    // Clear URL in database
    const { error } = await supabase
      .from('users')
      .update({ 
        custom_watermark_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('telegram_id', telegramId);

    if (error) throw error;

    return { success: true };

  } catch (error) {
    console.error('Delete watermark error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Delete failed' 
    };
  }
}

// ===================================
// Update Watermark Settings
// ===================================

export async function updateWatermarkSettings(
  telegramId: string,
  settings: Partial<CustomWatermarkSettings>
): Promise<BrandingUpdateResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // Get current settings
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('watermark_settings')
      .eq('telegram_id', telegramId)
      .single();

    if (fetchError) throw fetchError;

    // Merge with new settings
    const currentSettings = user?.watermark_settings || DEFAULT_WATERMARK_SETTINGS;
    const newSettings = { ...currentSettings, ...settings };

    // Update in database
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        watermark_settings: newSettings,
        updated_at: new Date().toISOString()
      })
      .eq('telegram_id', telegramId);

    if (updateError) throw updateError;

    // Update local store
    useUserStore.getState().setWatermarkSettings(newSettings);

    return { success: true };

  } catch (error) {
    console.error('Update settings error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Update failed' 
    };
  }
}

// ===================================
// Get User Branding Profile
// ===================================

export async function getBrandingProfile(
  telegramId: string
): Promise<UserBrandingProfile | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('custom_watermark_url, watermark_settings, name, phone')
      .eq('telegram_id', telegramId)
      .single();

    if (error) throw error;

    return {
      customWatermarkUrl: data.custom_watermark_url,
      watermarkSettings: data.watermark_settings || DEFAULT_WATERMARK_SETTINGS,
      textWatermark: {
        name: data.name || '',
        phone: data.phone || '',
      },
    };

  } catch (error) {
    console.error('Get branding profile error:', error);
    return null;
  }
}

// ===================================
// Preload Watermark Image (for Canvas)
// ===================================

export async function preloadWatermarkImage(
  url: string
): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn('Failed to load watermark image:', url);
      resolve(null);
    };
    
    img.src = url;
  });
}

// ===================================
// Calculate Watermark Dimensions
// ===================================

export function calculateWatermarkDimensions(
  watermarkWidth: number,
  watermarkHeight: number,
  imageWidth: number,
  _imageHeight: number, // Used for future aspect ratio calculations
  maxScalePercent: number = 15
): { width: number; height: number } {
  const maxWidth = (imageWidth * maxScalePercent) / 100;
  const aspectRatio = watermarkWidth / watermarkHeight;

  if (watermarkWidth > maxWidth) {
    return {
      width: maxWidth,
      height: maxWidth / aspectRatio,
    };
  }

  return {
    width: watermarkWidth,
    height: watermarkHeight,
  };
}

// ===================================
// Calculate Watermark Position
// ===================================

export function calculateWatermarkPosition(
  position: WatermarkPosition,
  imageWidth: number,
  imageHeight: number,
  watermarkWidth: number,
  watermarkHeight: number,
  padding: number = 20
): { x: number; y: number } {
  const positions: Record<WatermarkPosition, { x: number; y: number }> = {
    'top-left': { 
      x: padding, 
      y: padding 
    },
    'top-center': { 
      x: (imageWidth - watermarkWidth) / 2, 
      y: padding 
    },
    'top-right': { 
      x: imageWidth - watermarkWidth - padding, 
      y: padding 
    },
    'center-left': { 
      x: padding, 
      y: (imageHeight - watermarkHeight) / 2 
    },
    'center': { 
      x: (imageWidth - watermarkWidth) / 2, 
      y: (imageHeight - watermarkHeight) / 2 
    },
    'center-right': { 
      x: imageWidth - watermarkWidth - padding, 
      y: (imageHeight - watermarkHeight) / 2 
    },
    'bottom-left': { 
      x: padding, 
      y: imageHeight - watermarkHeight - padding 
    },
    'bottom-center': { 
      x: (imageWidth - watermarkWidth) / 2, 
      y: imageHeight - watermarkHeight - padding 
    },
    'bottom-right': { 
      x: imageWidth - watermarkWidth - padding, 
      y: imageHeight - watermarkHeight - padding 
    },
    'tile': { 
      x: 0, 
      y: 0 
    },
  };

  return positions[position] || positions['bottom-right'];
}

// ===================================
// Export Default Settings
// ===================================

export { DEFAULT_WATERMARK_SETTINGS };
