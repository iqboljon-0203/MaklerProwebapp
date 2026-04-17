import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'nodejs',
};

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = 'user_uploads';

/**
 * MaklerPro Storage Cleanup Task (Cron)
 * Deletes files older than 24 hours to save storage costs.
 */
export default async function handler(request: Request) {
  // 1. Configuration check
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response('Configuration missing', { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const now = new Date();
  const threshold = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

  try {
    console.log(`Cleaning up storage bucket: ${STORAGE_BUCKET}...`);

    // 2. List folders (userIds) in bucket
    // Note: Supabase lists top-level files/folders
    const { data: folders, error: foldersError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list('');

    if (foldersError) throw foldersError;

    let totalDeleted = 0;
    const errors: any[] = [];

    // 3. Iterate through folders (user directories)
    for (const folder of folders || []) {
      // Folders usually don't have metadata like created_at in the top-level list
      // So we peek inside
      if (folder.id === null) { // It's a directory
        const { data: files, error: filesError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .list(folder.name, { limit: 100 });

        if (filesError) {
          errors.push({ folder: folder.name, error: filesError.message });
          continue;
        }

        const filesToDelete: string[] = [];

        for (const file of files || []) {
            const fileCreatedAt = new Date(file.created_at);
            if (fileCreatedAt < threshold) {
                filesToDelete.push(`${folder.name}/${file.name}`);
            }
        }

        if (filesToDelete.length > 0) {
            const { error: deleteError } = await supabase.storage
                .from(STORAGE_BUCKET)
                .remove(filesToDelete);
            
            if (deleteError) {
                errors.push({ folder: folder.name, error: deleteError.message });
            } else {
                totalDeleted += filesToDelete.length;
            }
        }
      } else {
        // Handle files in root if any
        const fileCreatedAt = new Date(folder.created_at);
        if (fileCreatedAt < threshold) {
            await supabase.storage.from(STORAGE_BUCKET).remove([folder.name]);
            totalDeleted++;
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: `Cleanup completed. Deleted ${totalDeleted} files.`,
      errors: errors.length > 0 ? errors : undefined
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('Cleanup Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
