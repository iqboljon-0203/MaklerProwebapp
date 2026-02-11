import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
  maxDuration: 30,
};

// ===================================
// Types
// ===================================

interface ShotstackCallback {
  type: 'render';
  action: string;
  id: string;
  owner: string;
  status: 'queued' | 'fetching' | 'rendering' | 'saving' | 'done' | 'failed';
  url?: string;
  error?: string;
  completed?: string;
}

// ===================================
// Supabase Client
// ===================================

function getSupabaseClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// ===================================
// Upload Video to Supabase Storage
// ===================================

async function uploadVideoToStorage(
  supabase: ReturnType<typeof getSupabaseClient>,
  videoUrl: string,
  userId: string,
  jobId: string
): Promise<string> {
  // Download video from Shotstack
  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error('Failed to download video from Shotstack');
  }
  
  const videoBuffer = await response.arrayBuffer();
  const fileName = `slideshows/${userId}/${jobId}.mp4`;
  
  // Upload to Supabase Storage
  const { error: uploadError } = await supabase
    .storage
    .from('videos')
    .upload(fileName, videoBuffer, {
      contentType: 'video/mp4',
      cacheControl: '3600',
      upsert: true,
    });
  
  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }
  
  // Get public URL
  const { data: urlData } = supabase
    .storage
    .from('videos')
    .getPublicUrl(fileName);
  
  return urlData.publicUrl;
}

// ===================================
// Save to History
// ===================================

async function saveToHistory(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string,
  videoUrl: string,
  jobConfig: any
) {
  const { error } = await supabase
    .from('history')
    .insert({
      user_id: userId,
      type: 'video',
      title: `Slideshow - ${new Date().toLocaleDateString()}`,
      data: {
        url: videoUrl,
        aspectRatio: jobConfig?.aspectRatio || '9:16',
        imageCount: jobConfig?.images?.length || 0,
        transition: jobConfig?.transition || 'fade',
      },
      thumbnail: jobConfig?.images?.[0]?.url || null,
      created_at: new Date().toISOString(),
    });
  
  if (error) {
    console.error('Failed to save to history:', error);
  }
}

// ===================================
// Send Telegram Notification (Optional)
// ===================================

async function notifyUser(userId: string, videoUrl: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;
  
  try {
    // Get user's Telegram ID from database
    const supabase = getSupabaseClient();
    const { data: user } = await supabase
      .from('users')
      .select('telegram_id')
      .eq('id', userId)
      .single();
    
    if (!user?.telegram_id) return;
    
    // Send video to user via Telegram
    await fetch(`https://api.telegram.org/bot${botToken}/sendVideo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: user.telegram_id,
        video: videoUrl,
        caption: '🎬 Sizning slideshow videongiz tayyor!\n\n✅ Video yuklab olindi va galereyaga saqlandi.',
        parse_mode: 'HTML',
      }),
    });
  } catch (error) {
    console.error('Failed to notify user:', error);
  }
}

// ===================================
// Main Handler (Shotstack Callback)
// ===================================

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  try {
    const callback = await request.json() as ShotstackCallback;
    
    console.log('Video callback received:', {
      id: callback.id,
      status: callback.status,
      url: callback.url,
    });
    
    const supabase = getSupabaseClient();
    
    // Get job from database
    const { data: job, error: jobError } = await supabase
      .from('video_jobs')
      .select('*')
      .eq('shotstack_id', callback.id)
      .single();
    
    if (jobError || !job) {
      console.error('Job not found:', callback.id);
      return new Response('Job not found', { status: 404 });
    }
    
    // Update job status
    if (callback.status === 'done' && callback.url) {
      // Upload video to Supabase Storage
      const storageUrl = await uploadVideoToStorage(
        supabase,
        callback.url,
        job.user_id,
        callback.id
      );
      
      // Update job with final URL
      await supabase
        .from('video_jobs')
        .update({
          status: 'completed',
          video_url: storageUrl,
          completed_at: new Date().toISOString(),
        })
        .eq('shotstack_id', callback.id);
      
      // Save to history
      await saveToHistory(supabase, job.user_id, storageUrl, job.config);
      
      // Notify user (optional - via Telegram)
      await notifyUser(job.user_id, storageUrl);
      
    } else if (callback.status === 'failed') {
      // Mark job as failed
      await supabase
        .from('video_jobs')
        .update({
          status: 'failed',
          error: callback.error || 'Unknown error',
          completed_at: new Date().toISOString(),
        })
        .eq('shotstack_id', callback.id);
        
    } else {
      // Update status for intermediate states
      await supabase
        .from('video_jobs')
        .update({
          status: callback.status,
        })
        .eq('shotstack_id', callback.id);
    }
    
    return new Response('OK', { status: 200 });
    
  } catch (error) {
    console.error('Callback error:', error);
    return new Response('Internal error', { status: 500 });
  }
}
