import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface HistoryItem {
  id: string;
  type: 'image' | 'video' | 'text';
  thumbnail?: string; // Base64 or URL
  title: string;
  description?: string;
  data: string; // Base64 for images/videos, or text content
  createdAt: number;
}

interface HistoryState {
  items: HistoryItem[];
  addItem: (item: Omit<HistoryItem, 'id' | 'createdAt'>) => void;
  removeItem: (id: string) => void;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      items: [],
      
      addItem: (item) => set((state) => ({
        items: [
          {
            ...item,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
          },
          ...state.items,
        ].slice(0, 50), // Keep only last 50 items to save space
      })),
      
      removeItem: (id) => set((state) => ({
        items: state.items.filter((item) => item.id !== id),
      })),
      
      clearHistory: () => set({ items: [] }),
    }),
    {
      name: 'maklerpro-history',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
