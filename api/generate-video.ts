import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
  maxDuration: 60, // 60 seconds for Vercel Pro
};

// ===================================
// Types
// ===================================

interface SlideshowRequest {
  images: Array<{
    url: string;
    duration: number; // seconds
  }>;
  transition: 'fade' | 'slideLeft' | 'slideRight' | 'zoom' | 'none';
  transitionDuration: number; // seconds
  aspectRatio: '9:16' | '16:9' | '1:1';
  userId: string;
  callbackUrl?: string;
}

interface ShotstackClip {
  asset: {
    type: 'image';
    src: string;
  };
  start: number;
  length: number;
  transition?: {
    in: string;
    out: string;
  };
  effect?: string;
}

interface ShotstackTimeline {
  soundtrack?: {
    src: string;
    effect: string;
  };
  background: string;
  tracks: Array<{
    clips: ShotstackClip[];
  }>;
}

interface ShotstackOutput {
  format: 'mp4' | 'webm';
  resolution: 'sd' | 'hd' | '1080' | '4k';
  aspectRatio?: string;
  size?: {
    width: number;
    height: number;
  };
}

interface ShotstackRenderRequest {
  timeline: ShotstackTimeline;
  output: ShotstackOutput;
  callback?: string;
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
// Shotstack API Helper
// ===================================

const SHOTSTACK_API_URL = 'https://api.shotstack.io/v1';
const SHOTSTACK_SANDBOX_URL = 'https://api.shotstack.io/stage';

async function callShotstackAPI(
  endpoint: string,
  method: 'GET' | 'POST',
  body?: object
) {
  const apiKey = process.env.SHOTSTACK_API_KEY;
  const useSandbox = process.env.SHOTSTACK_SANDBOX === 'true';
  
  if (!apiKey) {
    throw new Error('SHOTSTACK_API_KEY not configured');
  }
  
  const baseUrl = useSandbox ? SHOTSTACK_SANDBOX_URL : SHOTSTACK_API_URL;
  
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Shotstack API error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

// ===================================
// Build Shotstack Timeline from Config
// ===================================

function buildShotstackTimeline(config: SlideshowRequest): ShotstackRenderRequest {
  const { images, transition, transitionDuration, aspectRatio } = config;
  
  // Map our transitions to Shotstack transitions
  const transitionMap: Record<string, string> = {
    fade: 'fade',
    slideLeft: 'slideLeft',
    slideRight: 'slideRight',
    zoom: 'zoom',
    none: '',
  };
  
  const shotstackTransition = transitionMap[transition] || '';
  
  // Build clips
  const clips: ShotstackClip[] = [];
  let currentStart = 0;
  
  images.forEach((image, index) => {
    const clip: ShotstackClip = {
      asset: {
        type: 'image',
        src: image.url,
      },
      start: currentStart,
      length: image.duration,
    };
    
    // Add transitions (except for first clip's "in" and last clip's "out")
    if (shotstackTransition && transition !== 'none') {
      clip.transition = {
        in: index > 0 ? shotstackTransition : '',
        out: index < images.length - 1 ? shotstackTransition : '',
      };
    }
    
    // Ken Burns effect for more dynamic video
    clip.effect = 'zoomIn';
    
    clips.push(clip);
    currentStart += image.duration - (transition !== 'none' ? transitionDuration : 0);
  });
  
  // Determine output size based on aspect ratio
  const sizeMap: Record<string, { width: number; height: number }> = {
    '9:16': { width: 1080, height: 1920 },
    '16:9': { width: 1920, height: 1080 },
    '1:1': { width: 1080, height: 1080 },
  };
  
  const size = sizeMap[aspectRatio] || sizeMap['9:16'];
  
  return {
    timeline: {
      background: '#000000',
      tracks: [
        {
          clips,
        },
      ],
    },
    output: {
      format: 'mp4',
      resolution: 'hd',
      size,
    },
    callback: config.callbackUrl,
  };
}

// ===================================
// Save Job to Database
// ===================================

async function saveVideoJob(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string,
  shotstackId: string,
  config: SlideshowRequest
) {
  const { error } = await supabase
    .from('video_jobs')
    .insert({
      user_id: userId,
      shotstack_id: shotstackId,
      status: 'queued',
      config: config,
      created_at: new Date().toISOString(),
    });
  
  if (error) {
    console.error('Failed to save video job:', error);
    throw error;
  }
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
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data',
      },
    });
  }
  
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  try {
    const body = await request.json() as SlideshowRequest;
    
    // Validate request
    if (!body.images || body.images.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No images provided', code: 'INVALID_INPUT' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (body.images.length > 20) {
      return new Response(
        JSON.stringify({ error: 'Maximum 20 images allowed', code: 'TOO_MANY_IMAGES' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Build Shotstack request
    const callbackUrl = `${process.env.VITE_APP_URL}/api/video-callback`;
    const shotstackRequest = buildShotstackTimeline({
      ...body,
      callbackUrl,
    });
    
    // Submit to Shotstack
    const renderResponse = await callShotstackAPI('/render', 'POST', shotstackRequest);
    
    if (!renderResponse.success || !renderResponse.response?.id) {
      throw new Error('Failed to queue video render');
    }
    
    const shotstackId = renderResponse.response.id;
    
    // Save job to database
    const supabase = getSupabaseClient();
    await saveVideoJob(supabase, body.userId, shotstackId, body);
    
    // Return job ID for polling
    return new Response(
      JSON.stringify({
        success: true,
        jobId: shotstackId,
        message: 'Video generation queued',
        estimatedTime: Math.ceil(body.images.length * 5), // ~5 seconds per image
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
    
  } catch (error) {
    console.error('Video generation error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to start video generation',
        details: errorMessage,
        code: 'GENERATION_ERROR'
      }),
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
