import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store';
import type { TelegramUser } from '@/types';

// ===================================
// Types
// ===================================

export interface UserProfile {
  telegramId: string;
  isPremium: boolean;
  dailyGenerations: number;
  maxDailyGenerations: number;
  premiumUntil?: string | null;
}

export interface UpdateResult {
  success: boolean;
  newCount?: number;
  error?: string;
}

// ===================================
// Constants
// ===================================

const FREE_DAILY_LIMIT = 5;

const DEFAULT_USER: UserProfile = {
  telegramId: 'unknown',
  isPremium: false,
  dailyGenerations: 0,
  maxDailyGenerations: FREE_DAILY_LIMIT
};

// ===================================
// Get User Profile
// ===================================

export async function getUserProfile(telegramUser?: TelegramUser): Promise<UserProfile> {
  if (!telegramUser) return DEFAULT_USER;

  const telegramId = String(telegramUser.id);
  
  if (!supabase) {
    console.warn('Supabase not configured, using default profile');
    return { ...DEFAULT_USER, telegramId };
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('telegram_id, is_premium, daily_generations, premium_until')
      .eq('telegram_id', telegramId)
      .single();

    if (error && error.code === 'PGRST116') {
      // User not found, create new
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          telegram_id: telegramId,
          is_premium: false,
          daily_generations: 0
        })
        .select()
        .single();
        
      if (createError) throw createError;
      
      return {
        telegramId,
        isPremium: newUser.is_premium,
        dailyGenerations: newUser.daily_generations,
        maxDailyGenerations: FREE_DAILY_LIMIT,
        premiumUntil: null
      };
    } else if (error) {
      throw error;
    }

    // Check if premium is still valid
    const isPremiumValid = data.is_premium && 
      (!data.premium_until || new Date(data.premium_until) > new Date());

    return {
      telegramId,
      isPremium: isPremiumValid,
      dailyGenerations: data.daily_generations || 0,
      maxDailyGenerations: FREE_DAILY_LIMIT,
      premiumUntil: data.premium_until
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return { ...DEFAULT_USER, telegramId };
  }
}

// ===================================
// Update Generations (Main Sync Function)
// ===================================

/**
 * Increments the daily_generations counter for a user in Supabase.
 * Only runs for non-premium users.
 * Also updates the local Zustand store.
 * 
 * @param telegramId - The user's Telegram ID
 * @param isPremium - Whether the user is premium (skip if true)
 * @returns UpdateResult with success status and new count
 */
export async function updateGenerations(
  telegramId: string,
  isPremium: boolean = false
): Promise<UpdateResult> {
  // Skip for premium users - they have unlimited access
  if (isPremium) {
    console.log('Skipping generation update for premium user');
    return { success: true, newCount: undefined };
  }

  if (!telegramId || telegramId === 'unknown') {
    console.warn('Invalid telegram ID for generation update');
    return { success: false, error: 'Invalid user ID' };
  }

  if (!supabase) {
    console.warn('Supabase not configured, updating local state only');
    // Update local state only
    const { user, setUser } = useUserStore.getState();
    const newCount = user.dailyGenerations + 1;
    setUser({ dailyGenerations: newCount });
    return { success: true, newCount };
  }

  try {
    // Try using RPC function first (atomic operation)
    const { error: rpcError } = await supabase.rpc('increment_daily_usage', { 
      user_id: telegramId 
    });

    if (rpcError) {
      // Fallback to manual update if RPC doesn't exist
      console.warn('RPC failed, using manual update:', rpcError.message);
      
      // Get current count
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('daily_generations')
        .eq('telegram_id', telegramId)
        .single();

      if (fetchError) throw fetchError;

      const newCount = (userData?.daily_generations || 0) + 1;

      // Update in database
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          daily_generations: newCount,
          updated_at: new Date().toISOString()
        })
        .eq('telegram_id', telegramId);

      if (updateError) throw updateError;

      // Update local state
      const { setUser } = useUserStore.getState();
      setUser({ dailyGenerations: newCount });

      return { success: true, newCount };
    }

    // RPC succeeded, fetch new count and update local state
    const { data: updatedUser } = await supabase
      .from('users')
      .select('daily_generations')
      .eq('telegram_id', telegramId)
      .single();

    const newCount = updatedUser?.daily_generations || 0;

    // Update local state
    const { setUser } = useUserStore.getState();
    setUser({ dailyGenerations: newCount });

    return { success: true, newCount };

  } catch (error) {
    console.error('Error updating generations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Database update failed';
    return { success: false, error: errorMessage };
  }
}

// ===================================
// Increment Usage (Legacy - wraps updateGenerations)
// ===================================

export async function incrementUsage(telegramId: string): Promise<boolean> {
  const { user } = useUserStore.getState();
  const result = await updateGenerations(telegramId, user.isPremium);
  return result.success;
}

// ===================================
// Reset Daily Usage (For scheduled jobs)
// ===================================

export async function resetDailyUsage(telegramId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('users')
      .update({ 
        daily_generations: 0,
        updated_at: new Date().toISOString()
      })
      .eq('telegram_id', telegramId);

    if (error) throw error;

    // Update local state
    const { setUser } = useUserStore.getState();
    setUser({ dailyGenerations: 0 });

    return true;
  } catch (error) {
    console.error('Error resetting daily usage:', error);
    return false;
  }
}

// ===================================
// Check Premium Status
// ===================================

export async function checkPremiumStatus(telegramId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('is_premium, premium_until')
      .eq('telegram_id', telegramId)
      .single();

    if (error) throw error;

    // Check if premium and not expired
    const isPremiumValid = data.is_premium && 
      (!data.premium_until || new Date(data.premium_until) > new Date());

    return isPremiumValid;
  } catch (error) {
    console.error('Error checking premium status:', error);
    return false;
  }
}

// ===================================
// Sync User State from Database
// ===================================

export async function syncUserState(telegramId: string): Promise<void> {
  if (!supabase || !telegramId) return;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('is_premium, daily_generations, premium_until')
      .eq('telegram_id', telegramId)
      .single();

    if (error) throw error;

    const isPremiumValid = data.is_premium && 
      (!data.premium_until || new Date(data.premium_until) > new Date());

    // Update local Zustand store
    const { setUser } = useUserStore.getState();
    setUser({
      isPremium: isPremiumValid,
      dailyGenerations: data.daily_generations || 0
    });

  } catch (error) {
    console.error('Error syncing user state:', error);
  }
}
