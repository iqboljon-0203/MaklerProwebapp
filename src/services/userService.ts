import { supabase } from '@/lib/supabase';
import type { TelegramUser } from '@/types';

export interface UserProfile {
  telegramId: string;
  isPremium: boolean;
  dailyGenerations: number;
  maxDailyGenerations: number;
}

const FREE_DAILY_LIMIT = 5;

// Mock user for dev/fallback
const DEFAULT_USER: UserProfile = {
  telegramId: 'unknown',
  isPremium: false,
  dailyGenerations: 0,
  maxDailyGenerations: FREE_DAILY_LIMIT
};

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
      .select('*')
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
        maxDailyGenerations: FREE_DAILY_LIMIT
      };
    } else if (error) {
      throw error;
    }

    return {
      telegramId,
      isPremium: data.is_premium,
      dailyGenerations: data.daily_generations,
      maxDailyGenerations: FREE_DAILY_LIMIT
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return { ...DEFAULT_USER, telegramId };
  }
}

export async function incrementUsage(telegramId: string): Promise<boolean> {
  if (!supabase) return true;

  try {
    const { error } = await supabase.rpc('increment_daily_usage', { user_id: telegramId });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error incrementing usage:', error);
    return false;
  }
}
