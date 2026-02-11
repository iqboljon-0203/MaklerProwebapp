import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

// ===================================
// Types
// ===================================

interface VideoJobStatus {
  jobId: string;
  status: 'queued' | 'fetching' | 'rendering' | 'saving' | 'completed' | 'failed';
  progress?: number;
  videoUrl?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
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
// Progress Estimation
// ===================================

function estimateProgress(status: string, createdAt: string, imageCount: number): number {
  const elapsed = Date.now() - new Date(createdAt).getTime();
  const estimatedTotal = imageCount * 5000; // ~5 seconds per image
  
  const statusProgress: Record<string, number> = {
    queued: 5,
    fetching: 20,
    rendering: 50,
    saving: 85,
    completed: 100,
    failed: 0,
  };
  
  const baseProgress = statusProgress[status] || 0;
  
  // Add time-based progress within the phase
  if (status === 'rendering') {
    const renderProgress = Math.min(30, (elapsed / estimatedTotal) * 30);
    return Math.round(baseProgress + renderProgress);
  }
  
  return baseProgress;
}

// ===================================
// Main Handler
// ===================================

export default async function handler(request: Request) {
  // Handle CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }
  
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  try {
    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');
    
    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'Missing jobId parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = getSupabaseClient();
    
    // Get job from database
    const { data: job, error } = await supabase
      .from('video_jobs')
      .select('*')
      .eq('shotstack_id', jobId)
      .single();
    
    if (error || !job) {
      return new Response(
        JSON.stringify({ error: 'Job not found', code: 'JOB_NOT_FOUND' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Calculate progress
    const imageCount = job.config?.images?.length || 5;
    const progress = estimateProgress(job.status, job.created_at, imageCount);
    
    const response: VideoJobStatus = {
      jobId: job.shotstack_id,
      status: job.status,
      progress,
      videoUrl: job.video_url || undefined,
      error: job.error || undefined,
      createdAt: job.created_at,
      completedAt: job.completed_at || undefined,
    };
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        // Short cache for polling
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
    
  } catch (error) {
    console.error('Status check error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to check status' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
