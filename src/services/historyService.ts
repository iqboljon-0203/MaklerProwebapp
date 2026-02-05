import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';

export interface HistoryItem {
  id: string;
  type: 'image' | 'video' | 'text';
  thumbnail?: string;
  title: string;
  data: string; // URL for files, Text content for text type
  created_at: string;
}

const BUCKET = 'user_uploads';

/**
 * Upload a file (Blob/File) to Supabase Storage
 */
export async function uploadFileToStorage(
  file: Blob | File, 
  folder: 'images' | 'videos', 
  userId: number | string
): Promise<string> {
  const ext = file.type.split('/')[1] || 'bin';
  const fileName = `${userId}/${folder}/${Date.now()}_${crypto.randomUUID()}.${ext}`;

  if (!supabase) throw new Error('Supabase client not initialized');

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  // Get Public URL
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(fileName);

  return publicUrl;
}

/**
 * Add an item to user's history in DB
 */
export async function addToHistory(
  item: Omit<HistoryItem, 'id' | 'created_at'>
) {
    const user = useUserStore.getState().user;
    if (!user) throw new Error("User not found");
    // Ensure telegramId is number if possible, or string. DB expects bigint.
    // user.telegramId in store is likely number.
    
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
        .from('user_history')
        .insert({
            telegram_id: user.telegramId,
            type: item.type,
            title: item.title,
            data: item.data, // This should be URL for files
            thumbnail: item.thumbnail
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Fetch all history items for the current user
 */
export async function fetchUserHistory() {
    const user = useUserStore.getState().user;
    if (!user) return []; 

    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
        .from('user_history')
        .select('*')
        .eq('telegram_id', user.telegramId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as HistoryItem[];
}

/**
 * Delete item from history (and file from storage if applicable)
 */
export async function deleteHistoryItem(id: string, fileUrl?: string) {
    if (!supabase) throw new Error('Supabase client not initialized');

    // 1. Delete from DB
    const { error } = await supabase
        .from('user_history')
        .delete()
        .eq('id', id);

    if (error) throw error;

    // 2. Delete from Storage (if it's a file URL)
    if (fileUrl && fileUrl.includes(BUCKET)) {
        try {
            // Extract path from URL: .../user_uploads/123/images/file.jpg
            const path = fileUrl.split(`${BUCKET}/`)[1];
            if (path) {
                await supabase.storage.from(BUCKET).remove([path]);
            }
        } catch (e) {
            console.error("Failed to delete file from storage", e);
        }
    }
}
