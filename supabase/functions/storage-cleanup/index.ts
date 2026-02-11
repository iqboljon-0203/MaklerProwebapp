// Supabase Edge Function: Storage Cleanup
// Deploy: supabase functions deploy storage-cleanup

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ===================================
// Types
// ===================================

interface CleanupConfig {
  dryRun: boolean;
  maxAgeHours: number;
  buckets: string[];
  tempFolders: string[];
}

interface CleanupResult {
  success: boolean;
  dryRun: boolean;
  scanned: number;
  deleted: number;
  skipped: number;
  errors: number;
  deletedFiles: string[];
  skippedFiles: string[];
  errorDetails: Array<{ file: string; error: string }>;
  executionTime: number;
}

interface StorageFile {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

// ===================================
// Configuration
// ===================================

const DEFAULT_CONFIG: CleanupConfig = {
  dryRun: true, // SAFETY: Default to dry-run
  maxAgeHours: 24,
  buckets: ['images', 'videos'],
  tempFolders: ['temp/', 'slideshow/', 'processing/'],
};

// ===================================
// Supabase Client
// ===================================

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ===================================
// Check if File is in Database
// ===================================

async function isFileInDatabase(
  supabase: ReturnType<typeof getSupabaseClient>,
  filePath: string,
  bucket: string
): Promise<boolean> {
  // Build the full public URL that would be stored in database
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
  
  // Check history table
  const { data: historyData } = await supabase
    .from('history')
    .select('id')
    .or(`thumbnail.eq.${publicUrl},data->url.eq.${publicUrl}`)
    .limit(1);
  
  if (historyData && historyData.length > 0) {
    return true;
  }
  
  // Check video_jobs table for video URLs
  if (bucket === 'videos') {
    const { data: videoData } = await supabase
      .from('video_jobs')
      .select('id')
      .eq('video_url', publicUrl)
      .limit(1);
    
    if (videoData && videoData.length > 0) {
      return true;
    }
  }
  
  return false;
}

// ===================================
// Get Files Older Than X Hours
// ===================================

async function getOldTempFiles(
  supabase: ReturnType<typeof getSupabaseClient>,
  bucket: string,
  folder: string,
  maxAgeHours: number
): Promise<StorageFile[]> {
  const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  
  const { data: files, error } = await supabase
    .storage
    .from(bucket)
    .list(folder, {
      limit: 1000,
      sortBy: { column: 'created_at', order: 'asc' },
    });
  
  if (error) {
    console.error(`Error listing files in ${bucket}/${folder}:`, error);
    return [];
  }
  
  if (!files) return [];
  
  // Filter files older than cutoff time
  return files.filter((file) => {
    const fileDate = new Date(file.created_at);
    return fileDate < cutoffTime;
  }) as StorageFile[];
}

// ===================================
// Delete File with Logging
// ===================================

async function deleteFile(
  supabase: ReturnType<typeof getSupabaseClient>,
  bucket: string,
  filePath: string,
  dryRun: boolean
): Promise<{ success: boolean; error?: string }> {
  if (dryRun) {
    console.log(`[DRY-RUN] Would delete: ${bucket}/${filePath}`);
    return { success: true };
  }
  
  const { error } = await supabase
    .storage
    .from(bucket)
    .remove([filePath]);
  
  if (error) {
    console.error(`Error deleting ${bucket}/${filePath}:`, error);
    return { success: false, error: error.message };
  }
  
  console.log(`[DELETED] ${bucket}/${filePath}`);
  return { success: true };
}

// ===================================
// Log Cleanup Results to Database
// ===================================

async function logCleanupResults(
  supabase: ReturnType<typeof getSupabaseClient>,
  result: CleanupResult
) {
  await supabase
    .from('cleanup_logs')
    .insert({
      dry_run: result.dryRun,
      scanned: result.scanned,
      deleted: result.deleted,
      skipped: result.skipped,
      errors: result.errors,
      deleted_files: result.deletedFiles,
      error_details: result.errorDetails,
      execution_time_ms: result.executionTime,
      created_at: new Date().toISOString(),
    });
}

// ===================================
// Main Cleanup Function
// ===================================

async function runCleanup(config: CleanupConfig): Promise<CleanupResult> {
  const startTime = Date.now();
  const supabase = getSupabaseClient();
  
  const result: CleanupResult = {
    success: true,
    dryRun: config.dryRun,
    scanned: 0,
    deleted: 0,
    skipped: 0,
    errors: 0,
    deletedFiles: [],
    skippedFiles: [],
    errorDetails: [],
    executionTime: 0,
  };
  
  console.log('='.repeat(50));
  console.log(`Storage Cleanup Started - ${new Date().toISOString()}`);
  console.log(`Mode: ${config.dryRun ? 'DRY-RUN (no actual deletions)' : 'LIVE'}`);
  console.log(`Max Age: ${config.maxAgeHours} hours`);
  console.log('='.repeat(50));
  
  for (const bucket of config.buckets) {
    for (const folder of config.tempFolders) {
      console.log(`\nScanning ${bucket}/${folder}...`);
      
      const oldFiles = await getOldTempFiles(
        supabase,
        bucket,
        folder,
        config.maxAgeHours
      );
      
      console.log(`Found ${oldFiles.length} files older than ${config.maxAgeHours} hours`);
      
      for (const file of oldFiles) {
        result.scanned++;
        const filePath = `${folder}${file.name}`;
        
        // Check if file is referenced in database
        const isInDb = await isFileInDatabase(supabase, filePath, bucket);
        
        if (isInDb) {
          console.log(`[SKIP] ${filePath} - exists in database`);
          result.skipped++;
          result.skippedFiles.push(`${bucket}/${filePath}`);
          continue;
        }
        
        // Delete the file
        const deleteResult = await deleteFile(supabase, bucket, filePath, config.dryRun);
        
        if (deleteResult.success) {
          result.deleted++;
          result.deletedFiles.push(`${bucket}/${filePath}`);
        } else {
          result.errors++;
          result.errorDetails.push({
            file: `${bucket}/${filePath}`,
            error: deleteResult.error || 'Unknown error',
          });
        }
      }
    }
  }
  
  result.executionTime = Date.now() - startTime;
  
  // Log results to database
  try {
    await logCleanupResults(supabase, result);
  } catch (e) {
    console.warn('Failed to log cleanup results:', e);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('Cleanup Complete');
  console.log(`Scanned: ${result.scanned}`);
  console.log(`Deleted: ${result.deleted}`);
  console.log(`Skipped: ${result.skipped}`);
  console.log(`Errors: ${result.errors}`);
  console.log(`Execution Time: ${result.executionTime}ms`);
  console.log('='.repeat(50));
  
  return result;
}

// ===================================
// Edge Function Handler
// ===================================

Deno.serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
  
  // Auth check (require service role or special header)
  const authHeader = req.headers.get('Authorization');
  const cronSecret = Deno.env.get('CRON_SECRET');
  const providedSecret = req.headers.get('X-Cron-Secret');
  
  // Allow if: service_role token OR matching cron secret
  if (!authHeader?.includes('service_role') && providedSecret !== cronSecret) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    // Parse config from request body (optional)
    let config = { ...DEFAULT_CONFIG };
    
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        config = {
          ...DEFAULT_CONFIG,
          ...body,
          dryRun: body.dryRun ?? DEFAULT_CONFIG.dryRun,
        };
      } catch {
        // Use default config if no body
      }
    }
    
    const result = await runCleanup(config);
    
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
    
  } catch (error) {
    console.error('Cleanup error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
