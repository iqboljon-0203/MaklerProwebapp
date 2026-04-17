import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  addToHistory, 
  fetchUserHistory, 
  deleteHistoryItem, 
  uploadFileToStorage,
  type HistoryItem 
} from '@/services/historyService';
import { useUserStore } from './userStore';

interface HistoryState {
  items: HistoryItem[];
  isLoading: boolean;
  isUploading: boolean;
  error: string | null;

  // Actions
  loadHistory: () => Promise<void>;
  addItem: (item: {
      type: 'image' | 'video' | 'text';
      title: string;
      data: string | Blob;
      thumbnail?: string;
  }) => Promise<void>;
  removeItem: (id: string, dataUrl: string) => Promise<void>;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      items: [],
      isLoading: false,
      isUploading: false,
      error: null,

      loadHistory: async () => {
        set({ isLoading: true, error: null });
        try {
          const items = await fetchUserHistory();
          set({ items });
        } catch (e: any) {
          console.error(e);
          // If offline, we keep the existing items (hydrated from storage)
          set({ error: 'Tarixni yuklashda xatolik (offline)' });
        } finally {
          set({ isLoading: false });
        }
      },

      addItem: async (item) => {
        set({ isUploading: true, error: null });
        try {
          let finalData = item.data;
          const user = useUserStore.getState().user;
          
          if (!user) throw new Error("User not authorized");

          // 1. If data is Blob/File (Image/Video), Upload first
          if (item.data instanceof Blob) {
            const folder = item.type === 'video' ? 'videos' : 'images';
            finalData = await uploadFileToStorage(item.data, folder, user.telegramId!);
          } 
          
          // 2. Save to DB
          const newItem = await addToHistory({
            type: item.type,
            title: item.title,
            data: finalData as string,
            thumbnail: item.thumbnail
          });

          // 3. Update UI
          set((state) => ({ 
            items: [newItem, ...state.items] 
          }));

        } catch (e: any) {
          console.error("Add item failed:", e);
          set({ error: 'Saqlashda xatolik yuz berdi' });
          throw e;
        } finally {
          set({ isUploading: false });
        }
      },

      removeItem: async (id, dataUrl) => {
        try {
          set((state) => ({
            items: state.items.filter((i) => i.id !== id)
          }));
          await deleteHistoryItem(id, dataUrl);
        } catch (e) {
          console.error(e);
        }
      },

      clearHistory: () => set({ items: [] }),
    }),
    {
      name: 'maklerpro-history',
      // Only persist items, not loading states or errors
      partialize: (state) => ({ items: state.items }),
    }
  )
);
