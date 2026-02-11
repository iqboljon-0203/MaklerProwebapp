import type { 
  SlideshowConfig, 
  TransitionType,
  ProcessedImage 
} from '@/types';
import { supabase } from '@/lib/supabase';

// ===================================
// Video Slideshow Service (Server-Side)
// ===================================

export interface SlideshowProgress {
  status: 'uploading' | 'queued' | 'fetching' | 'rendering' | 'saving' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
  jobId?: string;
  videoUrl?: string;
  error?: string;
}

export type ProgressCallback = (progress: SlideshowProgress) => void;

// ===================================
// API Endpoints
// ===================================

const API_BASE = '/api';

interface VideoJobResponse {
  success: boolean;
  jobId: string;
  message: string;
  estimatedTime: number;
}

interface VideoStatusResponse {
  jobId: string;
  status: 'queued' | 'fetching' | 'rendering' | 'saving' | 'completed' | 'failed';
  progress: number;
  videoUrl?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

// ===================================
// Upload Images to Supabase Storage
// ===================================

async function uploadImagesToStorage(
  images: ProcessedImage[],
  userId: string,
  onProgress?: ProgressCallback
): Promise<string[]> {
  const uploadedUrls: string[] = [];
  
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    
    onProgress?.({
      status: 'uploading',
      progress: Math.round((i / images.length) * 20),
      message: `Rasm yuklanmoqda ${i + 1}/${images.length}...`,
    });
    
    // Generate unique filename
    const fileName = `slideshow/${userId}/${Date.now()}_${i}.webp`;
    
    // Upload to Supabase Storage
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    const { error } = await supabase
      .storage
      .from('images')
      .upload(fileName, image.blob, {
        contentType: 'image/webp',
        cacheControl: '3600',
      });
    
    if (error) {
      throw new Error(`Failed to upload image ${i + 1}: ${error.message}`);
    }
    
    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from('images')
      .getPublicUrl(fileName);
    
    uploadedUrls.push(urlData.publicUrl);
  }
  
  return uploadedUrls;
}

// ===================================
// Start Server-Side Video Generation
// ===================================

async function startVideoGeneration(
  imageUrls: string[],
  config: SlideshowConfig,
  userId: string
): Promise<VideoJobResponse> {
  // Map config to API format
  const transitionMap: Record<TransitionType, string> = {
    none: 'none',
    fade: 'fade',
    'slide-left': 'slideLeft',
    'slide-right': 'slideRight',
    'zoom-in': 'zoom',
    'zoom-out': 'zoom',
  };
  
  const requestBody = {
    images: imageUrls.map(url => ({
      url,
      duration: config.duration,
    })),
    transition: transitionMap[config.transition] || 'fade',
    transitionDuration: config.transitionDuration,
    aspectRatio: config.aspectRatio,
    userId,
  };
  
  const response = await fetch(`${API_BASE}/generate-video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to start video generation');
  }
  
  return response.json();
}

// ===================================
// Poll for Video Status
// ===================================

async function pollVideoStatus(
  jobId: string,
  onProgress: ProgressCallback,
  maxAttempts: number = 120, // 2 minutes with 1-second intervals
  interval: number = 1000
): Promise<string> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const checkStatus = async () => {
      attempts++;
      
      try {
        const response = await fetch(`${API_BASE}/video-status?jobId=${jobId}`);
        
        if (!response.ok) {
          throw new Error('Failed to check status');
        }
        
        const status: VideoStatusResponse = await response.json();
        
        // Update progress
        const statusMessages: Record<string, string> = {
          queued: 'Navbatda kutilmoqda...',
          fetching: 'Rasmlar yuklanmoqda...',
          rendering: 'Video renderlanmoqda...',
          saving: 'Video saqlanmoqda...',
          completed: 'Video tayyor!',
          failed: 'Xatolik yuz berdi',
        };
        
        onProgress({
          status: status.status as SlideshowProgress['status'],
          progress: 20 + (status.progress * 0.8), // 20-100% range
          message: statusMessages[status.status] || 'Ishlanmoqda...',
          jobId,
          videoUrl: status.videoUrl,
          error: status.error,
        });
        
        if (status.status === 'completed' && status.videoUrl) {
          resolve(status.videoUrl);
          return;
        }
        
        if (status.status === 'failed') {
          reject(new Error(status.error || 'Video generation failed'));
          return;
        }
        
        if (attempts >= maxAttempts) {
          reject(new Error('Video generation timeout'));
          return;
        }
        
        // Continue polling
        setTimeout(checkStatus, interval);
        
      } catch (error) {
        if (attempts >= maxAttempts) {
          reject(error);
          return;
        }
        // Retry on network errors
        setTimeout(checkStatus, interval * 2);
      }
    };
    
    checkStatus();
  });
}

// ===================================
// Supabase Realtime Subscription (Alternative to Polling)
// ===================================

export function subscribeToVideoJob(
  jobId: string,
  onUpdate: (status: VideoStatusResponse) => void,
  onError: (error: Error) => void
): () => void {
  if (!supabase) {
    onError(new Error('Supabase not configured'));
    return () => {};
  }
  
  const channel = supabase
    .channel(`video_job_${jobId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'video_jobs',
        filter: `shotstack_id=eq.${jobId}`,
      },
      (payload) => {
        const job = payload.new as any;
        onUpdate({
          jobId: job.shotstack_id,
          status: job.status,
          progress: estimateProgress(job.status),
          videoUrl: job.video_url,
          error: job.error,
          createdAt: job.created_at,
          completedAt: job.completed_at,
        });
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Subscribed to video job updates');
      }
    });
  
  // Return unsubscribe function
  return () => {
    supabase?.removeChannel(channel);
  };
}

function estimateProgress(status: string): number {
  const progressMap: Record<string, number> = {
    queued: 10,
    fetching: 30,
    rendering: 60,
    saving: 90,
    completed: 100,
    failed: 0,
  };
  return progressMap[status] || 0;
}

// ===================================
// Main Function: Generate Slideshow (Server-Side)
// ===================================

export async function generateSlideshow(
  config: SlideshowConfig,
  userId: string,
  onProgress?: ProgressCallback
): Promise<string> {
  try {
    // Step 1: Upload images to Supabase Storage
    onProgress?.({
      status: 'uploading',
      progress: 0,
      message: 'Rasmlar yuklanmoqda...',
    });
    
    const imageUrls = await uploadImagesToStorage(config.images, userId, onProgress);
    
    // Step 2: Start server-side video generation
    onProgress?.({
      status: 'queued',
      progress: 20,
      message: 'Video generatsiya boshlanmoqda...',
    });
    
    const jobResponse = await startVideoGeneration(imageUrls, config, userId);
    
    onProgress?.({
      status: 'queued',
      progress: 25,
      message: 'Navbatda kutilmoqda...',
      jobId: jobResponse.jobId,
    });
    
    // Step 3: Poll for completion
    const videoUrl = await pollVideoStatus(
      jobResponse.jobId,
      onProgress!,
      Math.ceil(jobResponse.estimatedTime) * 2, // 2x estimated time as max
      1000
    );
    
    onProgress?.({
      status: 'completed',
      progress: 100,
      message: 'Video tayyor!',
      jobId: jobResponse.jobId,
      videoUrl,
    });
    
    return videoUrl;
    
  } catch (error) {
    console.error('Slideshow generation error:', error);
    
    onProgress?.({
      status: 'error',
      progress: 0,
      message: error instanceof Error ? error.message : 'Xatolik yuz berdi',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    throw error;
  }
}

// ===================================
// Generate with Realtime Updates (Alternative)
// ===================================

export async function generateSlideshowWithRealtime(
  config: SlideshowConfig,
  userId: string,
  onProgress?: ProgressCallback
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      // Upload images
      onProgress?.({
        status: 'uploading',
        progress: 0,
        message: 'Rasmlar yuklanmoqda...',
      });
      
      const imageUrls = await uploadImagesToStorage(config.images, userId, onProgress);
      
      // Start generation
      const jobResponse = await startVideoGeneration(imageUrls, config, userId);
      
      // Subscribe to realtime updates
      const unsubscribe = subscribeToVideoJob(
        jobResponse.jobId,
        (status) => {
          const statusMessages: Record<string, string> = {
            queued: 'Navbatda kutilmoqda...',
            fetching: 'Rasmlar yuklanmoqda...',
            rendering: 'Video renderlanmoqda...',
            saving: 'Video saqlanmoqda...',
            completed: 'Video tayyor!',
            failed: 'Xatolik yuz berdi',
          };
          
          onProgress?.({
            status: status.status as SlideshowProgress['status'],
            progress: 20 + (status.progress * 0.8),
            message: statusMessages[status.status] || 'Ishlanmoqda...',
            jobId: status.jobId,
            videoUrl: status.videoUrl,
            error: status.error,
          });
          
          if (status.status === 'completed' && status.videoUrl) {
            unsubscribe();
            resolve(status.videoUrl);
          }
          
          if (status.status === 'failed') {
            unsubscribe();
            reject(new Error(status.error || 'Video generation failed'));
          }
        },
        (error) => {
          reject(error);
        }
      );
      
      // Timeout fallback
      setTimeout(() => {
        unsubscribe();
        reject(new Error('Video generation timeout'));
      }, 300000); // 5 minutes max
      
    } catch (error) {
      reject(error);
    }
  });
}

// ===================================
// Utility Functions
// ===================================

export function estimateSlideshowDuration(config: SlideshowConfig): number {
  const { images, duration, transition, transitionDuration } = config;
  const transitions = transition !== 'none' ? images.length - 1 : 0;
  return images.length * duration + transitions * transitionDuration;
}

export function getAspectRatioDimensions(
  ratio: '9:16' | '16:9' | '1:1'
): { width: number; height: number } {
  switch (ratio) {
    case '9:16':
      return { width: 1080, height: 1920 };
    case '16:9':
      return { width: 1920, height: 1080 };
    case '1:1':
      return { width: 1080, height: 1080 };
  }
}

