import { create } from 'zustand';
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
      data: string | Blob; // Can be raw text, URL, or Blob (file) to upload
      thumbnail?: string; // Optional URL or Base64 (for video previews)
  }) => Promise<void>;
  removeItem: (id: string, dataUrl: string) => Promise<void>;
  clearHistory: () => void; // Usually clear local state, or delete all (dangerous)
}

export const useHistoryStore = create<HistoryState>((set) => ({
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
      set({ error: 'Tarixni yuklashda xatolik' });
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
        // User object existence is checked above, telegramId should be present
        finalData = await uploadFileToStorage(item.data, folder, user.telegramId!);
      } 
      // 2. If data is text or already URL, keep it as is
      
      // 3. Save to DB
      const newItem = await addToHistory({
        type: item.type,
        title: item.title,
        data: finalData as string,
        thumbnail: item.thumbnail
      });

      // 4. Update UI
      set((state) => ({ 
        items: [newItem, ...state.items] 
      }));

    } catch (e: any) {
      console.error("Add item failed:", e);
      set({ error: 'Saqlashda xatolik yuz berdi' });
      throw e; // Let component handle UI feedback
    } finally {
      set({ isUploading: false });
    }
  },

  removeItem: async (id, dataUrl) => {
    try {
      // Optimistic Update
      set((state) => ({
        items: state.items.filter((i) => i.id !== id)
      }));

      await deleteHistoryItem(id, dataUrl);
    } catch (e) {
      console.error(e);
      // Revert if needed?Ideally fetch again
    }
  },

  clearHistory: () => set({ items: [] }),
}));
