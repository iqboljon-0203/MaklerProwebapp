import type { CompressionConfig } from '@/types';
import type { ImageFile } from '@/types';

// ==========================================
// Helpers: Load Image & Create Canvas
// ==========================================

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function createCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  // Enable high quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return { canvas, ctx };
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: 'webp' | 'jpeg' | 'png' = 'webp',
  quality: number = 0.9
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      },
      `image/${format}`,
      quality
    );
  });
}

// ==========================================
// Native Resize Logic (No External Libs)
// ==========================================

/**
 * Resizes an image file using native Canvas API.
 * Replaces heavy 'browser-image-compression' library.
 */
export async function resizeImage(
  file: File,
  config: CompressionConfig
): Promise<Blob> {
  try {
    // 1. Load image
    const objectUrl = URL.createObjectURL(file);
    const img = await loadImage(objectUrl);
    
    // Revoke URL immediately after loading to free memory
    URL.revokeObjectURL(objectUrl);

    // 2. Calculate dimensions keeping aspect ratio
    let { width, height } = img;
    const maxWidth = config.maxWidth || 1920;
    const maxHeight = config.maxHeight || 1080;

    // Calculate aspect ratio
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    // 3. Draw to canvas
    const { canvas, ctx } = createCanvas(width, height);
    
    // Fill white background for JPEGs (to support transparent PNGs conversion)
    if (config.format === 'jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
    }

    ctx.drawImage(img, 0, 0, width, height);

    // 4. Convert to Blob
    const blob = await canvasToBlob(canvas, config.format || 'webp', config.quality || 0.8);
    
    // 5. Cleanup (help GC)
    canvas.width = 0;
    canvas.height = 0;
    
    return blob;
  } catch (error) {
    console.error('Resize failed:', error);
    throw error;
  }
}

// ==========================================
// File Helper
// ==========================================

export function createImageFromFile(file: File): Promise<ImageFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const preview = e.target?.result as string;
      
      try {
        const img = await loadImage(preview);
        
        resolve({
          id: crypto.randomUUID(),
          file,
          preview,
          width: img.width,
          height: img.height,
          size: file.size,
          name: file.name,
          type: file.type,
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
