import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { CustomWatermarkSettings } from '@/types';

// ===================================
// Types
// ===================================

interface WatermarkBranding {
  customLogoUrl: string | null;
  settings: CustomWatermarkSettings;
  textWatermark: {
    name: string;
    phone: string;
  };
}

interface UserData {
  isPremium: boolean;
  dailyGenerations: number;
  maxDailyGenerations: number;
  telegramId?: string | number;
  lastResetDate?: string; // YYYY-MM-DD format
}

interface UserState {
  user: UserData;
  branding: WatermarkBranding;
  setUser: (user: Partial<UserData>) => void;
  setWatermarkSettings: (settings: Partial<CustomWatermarkSettings>) => void;
  setCustomLogoUrl: (url: string | null) => void;
  setTextWatermark: (text: { name?: string; phone?: string }) => void;
  resetBranding: () => void;
  checkAndResetDaily: () => void;
}

// ===================================
// Default Values
// ===================================

const DEFAULT_WATERMARK_SETTINGS: CustomWatermarkSettings = {
  type: 'text',
  position: 'bottom-right',
  opacity: 0.8,
  scale: 15,
  enabled: true,
  padding: 20,
};

const DEFAULT_BRANDING: WatermarkBranding = {
  customLogoUrl: null,
  settings: DEFAULT_WATERMARK_SETTINGS,
  textWatermark: {
    name: '',
    phone: '',
  },
};

// Helper to get today's date in YYYY-MM-DD format (Uzbekistan timezone)
const getTodayDate = (): string => {
  const now = new Date();
  // Adjust for Uzbekistan time (UTC+5)
  const uzTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
  return uzTime.toISOString().split('T')[0];
};

// ===================================
// Store
// ===================================

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set, get) => ({
        user: {
          isPremium: false,
          dailyGenerations: 0,
          maxDailyGenerations: 5,
          lastResetDate: getTodayDate(),
        },
        branding: DEFAULT_BRANDING,
        
        setUser: (userData) => set((state) => ({ 
          user: { ...state.user, ...userData } 
        })),
        
        setWatermarkSettings: (settings) => set((state) => ({
          branding: {
            ...state.branding,
            settings: { ...state.branding.settings, ...settings },
          },
        })),
        
        setCustomLogoUrl: (url) => set((state) => ({
          branding: {
            ...state.branding,
            customLogoUrl: url,
          },
        })),
        
        setTextWatermark: (text) => set((state) => ({
          branding: {
            ...state.branding,
            textWatermark: { ...state.branding.textWatermark, ...text },
          },
        })),
        
        resetBranding: () => set({ branding: DEFAULT_BRANDING }),
        
        // Check if it's a new day and reset daily generations
        checkAndResetDaily: () => {
          const { user } = get();
          const today = getTodayDate();
          
          if (user.lastResetDate !== today) {
            console.log('🔄 New day detected, resetting daily generations');
            set({
              user: {
                ...user,
                dailyGenerations: 0,
                lastResetDate: today,
              },
            });
          }
        },
      }),
      {
        name: 'maklerpro-user-storage',
        onRehydrateStorage: () => (state) => {
          if (state) {
            console.log('User state rehydrated', state.user);
            // Check for daily reset on app load
            setTimeout(() => {
              state.checkAndResetDaily();
            }, 0);
          }
        },
      }
    ),
    { name: 'user-store' }
  )
);

// ===================================
// Selectors
// ===================================

export const selectWatermarkSettings = (state: UserState) => state.branding.settings;
export const selectCustomLogoUrl = (state: UserState) => state.branding.customLogoUrl;
export const selectTextWatermark = (state: UserState) => state.branding.textWatermark;
export const selectIsPremium = (state: UserState) => state.user.isPremium;
