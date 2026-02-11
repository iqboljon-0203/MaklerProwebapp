import type { 
  SlideshowConfig, 
  TransitionType 
} from '@/types';
import { loadImage, createCanvas, canvasToBlob } from './imageService';

// ===================================
// Local Video Slideshow Generator (Client-Side Fallback)
// ===================================

export interface SlideshowProgress {
  status: 'preparing' | 'rendering' | 'encoding' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
}

type ProgressCallback = (progress: SlideshowProgress) => void;

export async function generateSlideshowLocal(
  config: SlideshowConfig,
  onProgress?: ProgressCallback
): Promise<Blob> {
  const { images, duration, transition, transitionDuration, aspectRatio, fps } = config;
  
  // Calculate dimensions based on aspect ratio (9:16 for vertical video)
  const dimensions = getAspectRatioDimensions(aspectRatio);
  
  onProgress?.({
    status: 'preparing',
    progress: 0,
    message: 'Rasmlar tayyorlanmoqda...',
  });
  
  // Load all images
  const loadedImages: HTMLImageElement[] = [];
  for (let i = 0; i < images.length; i++) {
    const img = await loadImage(images[i].preview);
    loadedImages.push(img);
    onProgress?.({
      status: 'preparing',
      progress: ((i + 1) / images.length) * 20,
      message: `Rasm yuklanmoqda ${i + 1}/${images.length}...`,
    });
  }
  
  // Create frames
  const frames: Blob[] = [];
  const framesPerSlide = fps * duration;
  const framesPerTransition = fps * transitionDuration;
  let totalFrames = 0;
  
  // Calculate total frames for progress
  for (let i = 0; i < loadedImages.length; i++) {
    totalFrames += framesPerSlide;
    if (i < loadedImages.length - 1 && transition !== 'none') {
      totalFrames += framesPerTransition;
    }
  }
  
  let currentFrame = 0;
  
  onProgress?.({
    status: 'rendering',
    progress: 20,
    message: 'Kadrlar tuzilmoqda...',
  });
  
  for (let i = 0; i < loadedImages.length; i++) {
    // Render static frames for current slide
    for (let f = 0; f < framesPerSlide; f++) {
      const frame = await renderFrame(
        loadedImages[i],
        null,
        dimensions,
        'none',
        0
      );
      frames.push(frame);
      currentFrame++;
      
      onProgress?.({
        status: 'rendering',
        progress: 20 + (currentFrame / totalFrames) * 60,
        message: `Kadr ${currentFrame}/${totalFrames}...`,
      });
    }
    
    // Render transition frames
    if (i < loadedImages.length - 1 && transition !== 'none') {
      for (let f = 0; f < framesPerTransition; f++) {
        const transitionProgress = f / framesPerTransition;
        const frame = await renderFrame(
          loadedImages[i],
          loadedImages[i + 1],
          dimensions,
          transition,
          transitionProgress
        );
        frames.push(frame);
        currentFrame++;
        
        onProgress?.({
          status: 'rendering',
          progress: 20 + (currentFrame / totalFrames) * 60,
          message: `O'tish effekti ${currentFrame}/${totalFrames}...`,
        });
      }
    }
  }
  
  onProgress?.({
    status: 'encoding',
    progress: 80,
    message: 'Video kodlanmoqda...',
  });
  
  // Encode frames to WebM video using MediaRecorder
  const videoBlob = await encodeToVideo(frames, fps, dimensions, onProgress);
  
  onProgress?.({
    status: 'completed',
    progress: 100,
    message: 'Video tayyor!',
  });
  
  return videoBlob;
}

// ===================================
// Frame Rendering
// ===================================

async function renderFrame(
  currentImage: HTMLImageElement,
  nextImage: HTMLImageElement | null,
  dimensions: { width: number; height: number },
  transition: TransitionType,
  progress: number
): Promise<Blob> {
  const { canvas, ctx } = createCanvas(dimensions.width, dimensions.height);
  
  // Fill background with black
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, dimensions.width, dimensions.height);
  
  if (nextImage === null || transition === 'none') {
    // Just draw the current image
    drawImageCover(ctx, currentImage, dimensions);
  } else {
    // Apply transition effect
    switch (transition) {
      case 'fade':
        drawImageCover(ctx, currentImage, dimensions);
        ctx.globalAlpha = progress;
        drawImageCover(ctx, nextImage, dimensions);
        ctx.globalAlpha = 1;
        break;
        
      case 'slide-left':
        const offsetX1 = -dimensions.width * progress;
        drawImageCover(ctx, currentImage, dimensions, offsetX1, 0);
        drawImageCover(ctx, nextImage, dimensions, dimensions.width + offsetX1, 0);
        break;
        
      case 'slide-right':
        const offsetX2 = dimensions.width * progress;
        drawImageCover(ctx, currentImage, dimensions, offsetX2, 0);
        drawImageCover(ctx, nextImage, dimensions, -dimensions.width + offsetX2, 0);
        break;
        
      case 'zoom-in':
        const scale1 = 1 + progress * 0.2;
        ctx.save();
        ctx.translate(dimensions.width / 2, dimensions.height / 2);
        ctx.scale(scale1, scale1);
        ctx.translate(-dimensions.width / 2, -dimensions.height / 2);
        ctx.globalAlpha = 1 - progress;
        drawImageCover(ctx, currentImage, dimensions);
        ctx.restore();
        ctx.globalAlpha = progress;
        drawImageCover(ctx, nextImage, dimensions);
        ctx.globalAlpha = 1;
        break;
        
      case 'zoom-out':
        const scale2 = 1 - progress * 0.2;
        ctx.save();
        ctx.translate(dimensions.width / 2, dimensions.height / 2);
        ctx.scale(scale2, scale2);
        ctx.translate(-dimensions.width / 2, -dimensions.height / 2);
        ctx.globalAlpha = 1 - progress;
        drawImageCover(ctx, currentImage, dimensions);
        ctx.restore();
        ctx.globalAlpha = progress;
        drawImageCover(ctx, nextImage, dimensions);
        ctx.globalAlpha = 1;
        break;
    }
  }
  
  return canvasToBlob(canvas, 'webp', 0.8);
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dimensions: { width: number; height: number },
  offsetX: number = 0,
  offsetY: number = 0
): void {
  const { width, height } = dimensions;
  const imgRatio = img.width / img.height;
  const canvasRatio = width / height;
  
  let drawWidth: number;
  let drawHeight: number;
  let drawX: number;
  let drawY: number;
  
  if (imgRatio > canvasRatio) {
    // Image is wider
    drawHeight = height;
    drawWidth = img.width * (height / img.height);
    drawX = (width - drawWidth) / 2 + offsetX;
    drawY = offsetY;
  } else {
    // Image is taller
    drawWidth = width;
    drawHeight = img.height * (width / img.width);
    drawX = offsetX;
    drawY = (height - drawHeight) / 2 + offsetY;
  }
  
  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
}

// ===================================
// Video Encoding
// ===================================

async function encodeToVideo(
  frames: Blob[],
  fps: number,
  dimensions: { width: number; height: number },
  onProgress?: ProgressCallback
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const ctx = canvas.getContext('2d')!;
    
    // Use MediaRecorder to capture canvas
    const stream = canvas.captureStream(fps);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 1500000, // 1.5 Mbps
    });
    
    const chunks: Blob[] = [];
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      resolve(blob);
    };
    
    mediaRecorder.onerror = (event) => reject(new Error('MediaRecorder error: ' + event.type));
    mediaRecorder.start();
    
    let frameIndex = 0;
    const frameDuration = 1000 / fps;
    
    const renderNextFrame = async () => {
      if (frameIndex >= frames.length) {
        mediaRecorder.stop();
        return;
      }
      
      const frameBlob = frames[frameIndex];
      const img = await createImageBitmap(frameBlob);
      ctx.drawImage(img, 0, 0);
      
      frameIndex++;
      
      onProgress?.({
        status: 'encoding',
        progress: 80 + (frameIndex / frames.length) * 20,
        message: `Kadr kodlanmoqda ${frameIndex}/${frames.length}...`,
      });
      
      setTimeout(renderNextFrame, frameDuration);
    };
    
    renderNextFrame();
  });
}

// ===================================
// Utilities
// ===================================

function getAspectRatioDimensions(
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
