import { supabase } from '@/lib/supabase';

interface UploadOptions {
  bucket: string;
  path: string; // Full path including filename (e.g., 'users/123/avatar.jpg')
  upsert?: boolean;
}

/**
 * Uploads an image to Supabase Storage.
 * @param file - The file or blob to upload.
 * @param options - Configuration for bucket and path.
 * @returns Public URL of the uploaded image.
 */
export async function uploadImage(
  file: File | Blob,
  options: UploadOptions
): Promise<string> {
  if (!supabase) throw new Error('Supabase client not initialized (missing environment variables)');

  const { bucket, path, upsert = false } = options;

  try {
    // 1. Upload file
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      throw uploadError;
    }

    // 2. Get Public URL
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  } catch (error: any) {
    console.error('Upload failed:', error);
    throw new Error(error.message || 'Image upload failed');
  }
}
