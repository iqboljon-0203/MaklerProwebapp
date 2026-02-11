import { supabase } from '@/lib/supabase';

/**
 * Deletes one or more images from Supabase Storage.
 * @param bucket - The storage bucket name (e.g. 'history', 'avatars').
 * @param paths - Array of file paths to delete.
 */
export async function deleteImage(
  bucket: string,
  paths: string[]
): Promise<void> {
  if (!supabase) throw new Error('Supabase client not initialized');
  if (paths.length === 0) return;

  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove(paths);

    if (error) {
      console.error('Supabase remove error:', error);
      throw error;
    }
  } catch (error: any) {
    console.error('Delete failed:', error);
    throw new Error(error.message || 'Failed to delete images');
  }
}

/**
 * Extracts storage path from a full Supabase URL.
 * Example URL: '.../storage/v1/object/public/history/123/image.jpg'
 * Returns: '123/image.jpg' (removes base URL and bucket name if present)
 */
export function getPathFromUrl(url: string, bucketName: string): string | null {
  try {
    // Standard Supabase URL format: .../storage/v1/object/public/BUCKET/PATH
    // We want the part after the bucket name.
    
    // Split by bucket name
    const parts = url.split(`/${bucketName}/`);
    
    if (parts.length > 1) {
      // The second part is the path.
      // However, if there are multiple occurrences (unlikely but possible), take last part?
      // Usually parts[1] is correct.
      // Handle query params or fragments if any (though usually clean).
      return decodeURIComponent(parts[1].split('?')[0]);
    }
    
    return null;
  } catch (e) {
    return null;
  }
}
