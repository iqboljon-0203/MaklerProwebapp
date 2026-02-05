import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface UserState {
  user: {
    isPremium: boolean;
    dailyGenerations: number;
    maxDailyGenerations: number;
    telegramId?: string | number;
    // Add other profile fields if needed
  };
  setUser: (user: Partial<{ isPremium: boolean; dailyGenerations: number; maxDailyGenerations: number; telegramId?: string | number }>) => void;
}

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set) => ({
        user: {
          isPremium: false,
          dailyGenerations: 0,
          maxDailyGenerations: 5,
        },
        setUser: (userData) => set((state) => ({ 
            user: { ...state.user, ...userData } 
        })),
      }),
      {
        name: 'maklerpro-user-storage',
        // Safe rehydration handling for Telegram/Webview environment
        onRehydrateStorage: () => (state) => {
           if (state) {
             console.log('User state rehydrated', state.user);
           }
        }
      }
    ),
    { name: 'user-store' }
  )
);
