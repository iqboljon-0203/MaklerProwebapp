import { 
  resizeImage, 
  createImageFromFile, 
  loadImage, 
  createCanvas, 
  canvasToBlob 
} from '@/utils/image';
import type { 
  ImageFile, 
  ProcessedImage, 
  CompressionConfig, 
  WatermarkConfig, 
  EnhancementConfig 
} from '@/types';

// ===================================
// Image Compression Service
// ===================================

export async function compressImage(
  file: File,
  config: CompressionConfig
): Promise<Blob> {
  // Use the new centralized resize utility
  return await resizeImage(file, config);
}

export async function processImagesInQueue(
  files: File[],
  options: {
    compression: CompressionConfig;
    enhancement?: EnhancementConfig;
    watermark?: WatermarkConfig;
    isPremium?: boolean;
  },
  onProgress?: (progress: { current: number; total: number; status: string }) => void
): Promise<{ original: ImageFile; processed: ProcessedImage | null }[]> {
  const results: { original: ImageFile; processed: ProcessedImage | null }[] = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    
    // Notify start of processing for this file
    onProgress?.({
      current: i + 1,
      total,
      status: `Processing ${i + 1} of ${total}: ${file.name}`
    });

    try {
      // 1. Compression
      const compressedBlob = await compressImage(file, options.compression);
      const compressedFile = new File([compressedBlob], file.name, { type: compressedBlob.type });
      
      // Create ImageFile (Original reference)
      const imageFile = await createImageFromFile(compressedFile);
      
      let finalProcessed: ProcessedImage | null = null;

      // 2. Enhancement (Magic Fix) - Optional
      if (options.enhancement) {
        finalProcessed = await enhanceImage(imageFile, options.enhancement);
      }

      // 3. Watermark - Optional (or Forced if !isPremium)
      // If we already enhanced, we watermark the result of enhancement.
      // However, applyWatermark currently takes ImageFile. 
      // We need to support piping ProcessedImage into applyWatermark.
      // For now, if enhanced, we treat the enhanced result as the source for watermarking.
      
      if (options.watermark || !options.isPremium) {
        // Use the output of enhancement if available, otherwise original
        const sourceForWatermark: ImageFile = finalProcessed 
          ? { 
              ...imageFile, 
              preview: finalProcessed.preview, 
              width: finalProcessed.width, 
              height: finalProcessed.height 
            } 
          : imageFile;

        // Default watermark if config missing but forced by freemium
        const wmConfig = options.watermark || {
          text: '',
          position: 'center',
          fontSize: 20,
          opacity: 0,
          color: '#000',
          fontFamily: 'Arial',
          rotation: 0
        };

        finalProcessed = await applyWatermark(
          sourceForWatermark, 
          wmConfig, 
          options.isPremium
        );
      }
      
      // If no processing happened but we want to return the "original" as processed?
      // Or just return original. 
      // If finalProcessed is null, it means only compression happened. 
      // Let's create a ProcessedImage from the compressed original if needed, or just return null for processed.
      
      results.push({ original: imageFile, processed: finalProcessed });

    } catch (error) {
      console.error(`Failed to process ${file.name}`, error);
      // We continue with next file even if one fails
    }
  }

  return results;
}

// ===================================
// Image Loading Utilities
// ===================================

// NOTE: Specific helpers moved to @/utils/image/resizeImage.ts, but keeping
// aliases here if other files imported them from imageService.ts.
// Best practice would be to update imports in other files, but for now we re-export isn't trivial 
// without module structure changes, so we just use the imported ones.
// (Actually, enhanceImage below uses them, so we need them "available" in this scope, 
// which they are via the top-level import).

// ===================================
// Canvas Utilities
// ===================================

// ===================================
// Canvas Utilities
// ===================================

// createCanavs and canvasToBlob are imported from @/utils/image

// ===================================
// Watermark Service
// ===================================

export async function applyWatermark(
  imageFile: ImageFile,
  config: WatermarkConfig,
  isPremium: boolean = false
): Promise<ProcessedImage> {
  const img = await loadImage(imageFile.preview);
  const { canvas, ctx } = createCanvas(img.width, img.height);
  
  // Draw original image
  ctx.drawImage(img, 0, 0);
  
  // Configure text style
  ctx.globalAlpha = config.opacity;
  ctx.fillStyle = config.color;
  ctx.font = `bold ${config.fontSize}px ${config.fontFamily}`;
  ctx.textBaseline = 'top'; // Easier for multiline

  // Calculate position
  const { x, y, textAlign } = getWatermarkPosition(
    config.position,
    img.width,
    img.height,
    config.fontSize
  );
  
  ctx.textAlign = textAlign;
  
  const drawWatermarkText = () => {
    // Draw primary text (Name)
    ctx.fillText(config.text, 0, 0);
    
    // Draw secondary text (Phone) if exists
    if (config.secondText) {
      const secondaryFontSize = config.fontSize * 0.75;
      ctx.font = `${secondaryFontSize}px ${config.fontFamily}`;
      // Add some spacing
      const spacing = config.fontSize * 0.2;
      ctx.fillText(config.secondText, 0, config.fontSize + spacing);
    }
  };

  // Apply rotation if needed
  if (config.rotation !== 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((config.rotation * Math.PI) / 180);
    drawWatermarkText();
    ctx.restore();
  } else {
    // Adjust y to center the block of text vertically if needed, since we changed baseline to top
    // For simplicity, we stick to the calculated coordinates but might need offset adjustment based on position
    let drawY = y;
    if (config.position.includes('bottom')) {
       // if bottom, move up by total height
       const totalHeight = config.fontSize + (config.secondText ? (config.fontSize * 0.75 + config.fontSize * 0.2) : 0);
       drawY = y - totalHeight;
    } else if (config.position.includes('center') && !config.position.includes('top')) { // 'center' or 'center-left/right'
       const totalHeight = config.fontSize + (config.secondText ? (config.fontSize * 0.75 + config.fontSize * 0.2) : 0);
       drawY = y - totalHeight / 2;
    }
    
    ctx.save();
    ctx.translate(x, drawY);
    drawWatermarkText();
    ctx.restore();
  }
  
  // Apply logo if provided
  if (config.logo && config.logoSize) {
    const logoImg = await loadImage(config.logo);
    const logoSize = config.logoSize;
    const padding = 20;
    
    // Position logo based on watermark position to avoid overlap or put it in a fixed corner?
    // User requirement: "overlays the user's name, phone number, and a logo"
    // Usually logo goes to top-right or opposite corner of text. 
    // For now, let's keep logo at bottom-right unless text is there.
    
    let logoX = img.width - logoSize - padding;
    let logoY = img.height - logoSize - padding;

    if (config.position === 'bottom-right') {
       // Move logo to bottom-left if text is bottom-right
       logoX = padding;
    }

    ctx.globalAlpha = config.opacity;
    ctx.drawImage(
      logoImg,
      logoX,
      logoY,
      logoSize,
      logoSize
    );
  }
  
  // FREEMIUM: Force branding if not premium
  if (!isPremium) {
    ctx.save();
    ctx.globalAlpha = 0.3; // Semi-transparent
    ctx.fillStyle = '#FFFFFF';
    const brandSize = Math.max(img.width, img.height) * 0.15; // 15% of image size
    ctx.font = `bold ${brandSize}px Arial`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    
    // Center of image
    ctx.translate(img.width / 2, img.height / 2);
    ctx.rotate(-45 * Math.PI / 180); // 45 degree rotation
    
    // Draw text with outline for better visibility
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = brandSize * 0.05;
    ctx.strokeText('MaklerPro', 0, 0);
    ctx.fillText('MaklerPro', 0, 0);
    
    ctx.restore();
  }

  ctx.globalAlpha = 1;
  
  const blob = await canvasToBlob(canvas, 'webp', 0.9);
  
  return {
    id: crypto.randomUUID(),
    originalId: imageFile.id,
    blob,
    preview: URL.createObjectURL(blob),
    width: img.width,
    height: img.height,
    size: blob.size,
  };
}

function getWatermarkPosition(
  position: WatermarkConfig['position'],
  width: number,
  height: number,
  fontSize: number
): { x: number; y: number; textAlign: CanvasTextAlign } {
  const padding = fontSize;
  
  const positions: Record<string, { x: number; y: number; textAlign: CanvasTextAlign }> = {
    'top-left': { x: padding, y: padding + fontSize / 2, textAlign: 'left' },
    'top-center': { x: width / 2, y: padding + fontSize / 2, textAlign: 'center' },
    'top-right': { x: width - padding, y: padding + fontSize / 2, textAlign: 'right' },
    'center-left': { x: padding, y: height / 2, textAlign: 'left' },
    'center': { x: width / 2, y: height / 2, textAlign: 'center' },
    'center-right': { x: width - padding, y: height / 2, textAlign: 'right' },
    'bottom-left': { x: padding, y: height - padding - fontSize / 2, textAlign: 'left' },
    'bottom-center': { x: width / 2, y: height - padding - fontSize / 2, textAlign: 'center' },
    'bottom-right': { x: width - padding, y: height - padding - fontSize / 2, textAlign: 'right' },
  };
  
  return positions[position] || positions['bottom-right'];
}

// ===================================
// Image Enhancement Service (Magic Fix)
// ===================================

export async function enhanceImage(
  imageFile: ImageFile,
  config: EnhancementConfig
): Promise<ProcessedImage> {
  const img = await loadImage(imageFile.preview);
  const { canvas, ctx } = createCanvas(img.width, img.height);
  
  // Draw original image
  ctx.drawImage(img, 0, 0);
  
  // Get image data for pixel manipulation
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Apply brightness, contrast, and saturation
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    
    // Brightness adjustment (-100 to 100)
    const brightnessMultiplier = 1 + config.brightness / 100;
    r *= brightnessMultiplier;
    g *= brightnessMultiplier;
    b *= brightnessMultiplier;
    
    // Contrast adjustment (-100 to 100)
    const contrastFactor = (259 * (config.contrast + 255)) / (255 * (259 - config.contrast));
    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    b = contrastFactor * (b - 128) + 128;
    
    // Saturation adjustment (-100 to 100)
    const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
    const saturationMultiplier = 1 + config.saturation / 100;
    r = gray + saturationMultiplier * (r - gray);
    g = gray + saturationMultiplier * (g - gray);
    b = gray + saturationMultiplier * (b - gray);
    
    // Clamp values
    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  const blob = await canvasToBlob(canvas, 'webp', 0.9);
  
  return {
    id: crypto.randomUUID(),
    originalId: imageFile.id,
    blob,
    preview: URL.createObjectURL(blob),
    width: img.width,
    height: img.height,
    size: blob.size,
  };
}

export function getMagicFixPreset(): EnhancementConfig {
  return {
    brightness: 10,
    contrast: 20,
    saturation: 30,
    sharpness: 0,
  };
}

// ===================================
// Batch Processing Types
// ===================================

export interface BatchImageResult {
  imageId: string;
  imageName: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  result?: ProcessedImage;
  error?: string;
}

export interface BatchProgress {
  total: number;
  completed: number;
  successful: number;
  failed: number;
  currentImageName: string;
  results: BatchImageResult[];
}

export type BatchProgressCallback = (progress: BatchProgress) => void;

// ===================================
// Concurrency Control Queue
// ===================================

class ConcurrencyQueue {
  private queue: (() => Promise<void>)[] = [];
  private running = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent: number = 3) {
    this.maxConcurrent = maxConcurrent;
  }

  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const execute = async () => {
        this.running++;
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.running--;
          this.processNext();
        }
      };

      if (this.running < this.maxConcurrent) {
        execute();
      } else {
        this.queue.push(execute);
      }
    });
  }

  private processNext() {
    if (this.queue.length > 0 && this.running < this.maxConcurrent) {
      const next = this.queue.shift();
      next?.();
    }
  }
}

// ===================================
// Batch Image Enhancement (Parallel with Concurrency Control)
// ===================================

/**
 * Process multiple images in parallel with concurrency control.
 * Safe for mobile devices - limits concurrent canvas operations.
 * 
 * @param images - Array of ImageFile objects to process
 * @param config - Enhancement configuration
 * @param onProgress - Callback for progress updates
 * @param maxConcurrent - Maximum number of concurrent operations (default: 3)
 * @returns Array of BatchImageResult
 */
export async function processImagesBatch(
  images: ImageFile[],
  config: EnhancementConfig,
  onProgress?: BatchProgressCallback,
  maxConcurrent: number = 3
): Promise<BatchImageResult[]> {
  const queue = new ConcurrencyQueue(maxConcurrent);
  const results: BatchImageResult[] = images.map(img => ({
    imageId: img.id,
    imageName: img.name,
    status: 'pending' as const,
  }));

  const progress: BatchProgress = {
    total: images.length,
    completed: 0,
    successful: 0,
    failed: 0,
    currentImageName: '',
    results,
  };

  // Notify initial state
  onProgress?.(progress);

  // Create processing tasks
  const tasks = images.map((image, index) => {
    return queue.add(async () => {
      // Update status to processing
      results[index].status = 'processing';
      progress.currentImageName = image.name;
      onProgress?.({ ...progress, results: [...results] });

      try {
        // Process the image
        const processed = await enhanceImage(image, config);
        
        // Update result
        results[index].status = 'success';
        results[index].result = processed;
        progress.successful++;
        
      } catch (error) {
        // Handle individual image failure
        console.error(`Failed to process ${image.name}:`, error);
        results[index].status = 'error';
        results[index].error = error instanceof Error ? error.message : 'Unknown error';
        progress.failed++;
      } finally {
        progress.completed++;
        onProgress?.({ ...progress, results: [...results] });
      }
    });
  });

  // Wait for all tasks to complete
  await Promise.allSettled(tasks);

  // Final progress update
  progress.currentImageName = '';
  onProgress?.({ ...progress, results: [...results] });

  return results;
}

// ===================================
// Batch Processing with Full Pipeline (Compress + Enhance + Watermark)
// ===================================

export interface BatchPipelineOptions {
  compression?: CompressionConfig;
  enhancement?: EnhancementConfig;
  watermark?: WatermarkConfig;
  isPremium?: boolean;
}

export async function processBatchPipeline(
  images: ImageFile[],
  options: BatchPipelineOptions,
  onProgress?: BatchProgressCallback,
  maxConcurrent: number = 3
): Promise<BatchImageResult[]> {
  const queue = new ConcurrencyQueue(maxConcurrent);
  const results: BatchImageResult[] = images.map(img => ({
    imageId: img.id,
    imageName: img.name,
    status: 'pending' as const,
  }));

  const progress: BatchProgress = {
    total: images.length,
    completed: 0,
    successful: 0,
    failed: 0,
    currentImageName: '',
    results,
  };

  onProgress?.(progress);

  const tasks = images.map((image, index) => {
    return queue.add(async () => {
      results[index].status = 'processing';
      progress.currentImageName = image.name;
      onProgress?.({ ...progress, results: [...results] });

      try {
        let currentImage = image;
        let finalResult: ProcessedImage | undefined;

        // Step 1: Compression (if configured)
        if (options.compression) {
          const compressedBlob = await compressImage(image.file, options.compression);
          const compressedFile = new File([compressedBlob], image.name, { type: compressedBlob.type });
          currentImage = await createImageFromFile(compressedFile);
        }

        // Step 2: Enhancement (if configured)
        if (options.enhancement) {
          finalResult = await enhanceImage(currentImage, options.enhancement);
          // Update currentImage for next step
          currentImage = {
            ...currentImage,
            preview: finalResult.preview,
            width: finalResult.width,
            height: finalResult.height,
          };
        }

        // Step 3: Watermark (if configured or forced for non-premium)
        if (options.watermark || !options.isPremium) {
          const wmConfig = options.watermark || {
            text: '',
            position: 'center' as const,
            fontSize: 20,
            opacity: 0,
            color: '#000',
            fontFamily: 'Arial',
            rotation: 0,
          };
          finalResult = await applyWatermark(currentImage, wmConfig, options.isPremium);
        }

        // If no processing, create a basic ProcessedImage from original
        if (!finalResult) {
          const blob = await fetch(currentImage.preview).then(r => r.blob());
          finalResult = {
            id: crypto.randomUUID(),
            originalId: image.id,
            blob,
            preview: currentImage.preview,
            width: currentImage.width,
            height: currentImage.height,
            size: blob.size,
          };
        }

        results[index].status = 'success';
        results[index].result = finalResult;
        progress.successful++;

      } catch (error) {
        console.error(`Failed to process ${image.name}:`, error);
        results[index].status = 'error';
        results[index].error = error instanceof Error ? error.message : 'Unknown error';
        progress.failed++;
      } finally {
        progress.completed++;
        onProgress?.({ ...progress, results: [...results] });
      }
    });
  });

  await Promise.allSettled(tasks);

  progress.currentImageName = '';
  onProgress?.({ ...progress, results: [...results] });

  return results;
}

// ===================================
// Utility: Get Batch Summary
// ===================================

export function getBatchSummary(results: BatchImageResult[]): {
  total: number;
  successful: number;
  failed: number;
  successRate: number;
} {
  const total = results.length;
  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'error').length;
  const successRate = total > 0 ? (successful / total) * 100 : 0;

  return { total, successful, failed, successRate };
}

// ===================================
// Custom PNG Watermark Types
// ===================================

import type { CustomWatermarkSettings, WatermarkPosition } from '@/types';

export interface CustomWatermarkConfig {
  logoUrl?: string;
  textWatermark?: {
    name: string;
    phone: string;
  };
  settings: CustomWatermarkSettings;
  isPremium?: boolean;
}

// ===================================
// Apply Custom PNG Watermark
// ===================================

/**
 * Applies a custom PNG watermark logo to an image.
 * Supports auto-scaling, positioning, and opacity.
 */
export async function applyCustomWatermark(
  imageFile: ImageFile,
  config: CustomWatermarkConfig
): Promise<ProcessedImage> {
  const img = await loadImage(imageFile.preview);
  const { canvas, ctx } = createCanvas(img.width, img.height);
  
  // Draw original image
  ctx.drawImage(img, 0, 0);
  
  const { settings, logoUrl, textWatermark, isPremium } = config;
  
  if (!settings.enabled) {
    // Return original if watermark disabled
    const blob = await canvasToBlob(canvas, 'webp', 0.9);
    return {
      id: crypto.randomUUID(),
      originalId: imageFile.id,
      blob,
      preview: URL.createObjectURL(blob),
      width: img.width,
      height: img.height,
      size: blob.size,
    };
  }

  // Apply logo watermark
  if ((settings.type === 'logo' || settings.type === 'both') && logoUrl) {
    await drawLogoWatermark(ctx, logoUrl, img.width, img.height, settings);
  }
  
  // Apply text watermark
  if ((settings.type === 'text' || settings.type === 'both') && textWatermark) {
    drawTextWatermark(ctx, textWatermark, img.width, img.height, settings);
  }
  
  // Apply MaklerPro branding for non-premium users
  if (!isPremium) {
    drawMaklerProBranding(ctx, img.width, img.height);
  }
  
  const blob = await canvasToBlob(canvas, 'webp', 0.9);
  
  return {
    id: crypto.randomUUID(),
    originalId: imageFile.id,
    blob,
    preview: URL.createObjectURL(blob),
    width: img.width,
    height: img.height,
    size: blob.size,
  };
}

// ===================================
// Draw Logo Watermark
// ===================================

async function drawLogoWatermark(
  ctx: CanvasRenderingContext2D,
  logoUrl: string,
  imageWidth: number,
  imageHeight: number,
  settings: CustomWatermarkSettings
): Promise<void> {
  try {
    const logo = await loadImage(logoUrl);
    
    // Calculate dimensions with auto-scaling
    const maxWidth = (imageWidth * settings.scale) / 100;
    const aspectRatio = logo.width / logo.height;
    
    let drawWidth = logo.width;
    let drawHeight = logo.height;
    
    // Scale down if larger than max
    if (drawWidth > maxWidth) {
      drawWidth = maxWidth;
      drawHeight = maxWidth / aspectRatio;
    }
    
    // Calculate position
    const { x, y } = calculateLogoPosition(
      settings.position,
      imageWidth,
      imageHeight,
      drawWidth,
      drawHeight,
      settings.padding || 20
    );
    
    // Apply opacity
    ctx.globalAlpha = settings.opacity;
    
    // Handle tile position (repeat watermark)
    if (settings.position === 'tile') {
      drawTiledWatermark(ctx, logo, imageWidth, imageHeight, drawWidth, drawHeight, settings.opacity);
    } else {
      ctx.drawImage(logo, x, y, drawWidth, drawHeight);
    }
    
    ctx.globalAlpha = 1;
    
  } catch (error) {
    console.error('Failed to load logo watermark:', error);
  }
}

// ===================================
// Draw Tiled Watermark
// ===================================

function drawTiledWatermark(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement,
  imageWidth: number,
  imageHeight: number,
  logoWidth: number,
  logoHeight: number,
  opacity: number
): void {
  const spacingX = logoWidth * 2;
  const spacingY = logoHeight * 2;
  
  ctx.globalAlpha = opacity * 0.3; // Lower opacity for tiled
  
  for (let y = 0; y < imageHeight; y += spacingY) {
    for (let x = 0; x < imageWidth; x += spacingX) {
      ctx.save();
      ctx.translate(x + logoWidth / 2, y + logoHeight / 2);
      ctx.rotate(-30 * Math.PI / 180); // 30 degree rotation
      ctx.drawImage(logo, -logoWidth / 2, -logoHeight / 2, logoWidth, logoHeight);
      ctx.restore();
    }
  }
  
  ctx.globalAlpha = 1;
}

// ===================================
// Draw Text Watermark
// ===================================

function drawTextWatermark(
  ctx: CanvasRenderingContext2D,
  textWatermark: { name: string; phone: string },
  imageWidth: number,
  imageHeight: number,
  settings: CustomWatermarkSettings
): void {
  const { name, phone } = textWatermark;
  if (!name && !phone) return;
  
  const padding = settings.padding || 20;
  const fontSize = Math.max(imageWidth * 0.03, 16); // Min 16px, 3% of width
  
  ctx.globalAlpha = settings.opacity;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textBaseline = 'top';
  
  // Calculate text dimensions
  const nameMetrics = ctx.measureText(name);
  const phoneMetrics = ctx.measureText(phone);
  const textWidth = Math.max(nameMetrics.width, phoneMetrics.width);
  const lineHeight = fontSize * 1.3;
  const textHeight = phone ? lineHeight * 2 : lineHeight;
  
  // Get position
  const { x, y, textAlign } = getTextWatermarkPosition(
    settings.position,
    imageWidth,
    imageHeight,
    textWidth,
    textHeight,
    padding
  );
  
  ctx.textAlign = textAlign;
  
  // Draw text shadow for better visibility
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  // Draw name
  if (name) {
    ctx.fillText(name, x, y);
  }
  
  // Draw phone
  if (phone) {
    ctx.font = `${fontSize * 0.85}px Arial, sans-serif`;
    ctx.fillText(phone, x, y + lineHeight);
  }
  
  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.globalAlpha = 1;
}

// ===================================
// Position Calculation Helpers
// ===================================

function calculateLogoPosition(
  position: WatermarkPosition,
  imageWidth: number,
  imageHeight: number,
  logoWidth: number,
  logoHeight: number,
  padding: number
): { x: number; y: number } {
  const positions: Record<WatermarkPosition, { x: number; y: number }> = {
    'top-left': { x: padding, y: padding },
    'top-center': { x: (imageWidth - logoWidth) / 2, y: padding },
    'top-right': { x: imageWidth - logoWidth - padding, y: padding },
    'center-left': { x: padding, y: (imageHeight - logoHeight) / 2 },
    'center': { x: (imageWidth - logoWidth) / 2, y: (imageHeight - logoHeight) / 2 },
    'center-right': { x: imageWidth - logoWidth - padding, y: (imageHeight - logoHeight) / 2 },
    'bottom-left': { x: padding, y: imageHeight - logoHeight - padding },
    'bottom-center': { x: (imageWidth - logoWidth) / 2, y: imageHeight - logoHeight - padding },
    'bottom-right': { x: imageWidth - logoWidth - padding, y: imageHeight - logoHeight - padding },
    'tile': { x: 0, y: 0 },
  };
  
  return positions[position] || positions['bottom-right'];
}

function getTextWatermarkPosition(
  position: WatermarkPosition,
  imageWidth: number,
  imageHeight: number,
  _textWidth: number, // Reserved for future text-aware positioning
  textHeight: number,
  padding: number
): { x: number; y: number; textAlign: CanvasTextAlign } {
  type PositionConfig = { x: number; y: number; textAlign: CanvasTextAlign };
  
  const positions: Record<WatermarkPosition, PositionConfig> = {
    'top-left': { x: padding, y: padding, textAlign: 'left' },
    'top-center': { x: imageWidth / 2, y: padding, textAlign: 'center' },
    'top-right': { x: imageWidth - padding, y: padding, textAlign: 'right' },
    'center-left': { x: padding, y: (imageHeight - textHeight) / 2, textAlign: 'left' },
    'center': { x: imageWidth / 2, y: (imageHeight - textHeight) / 2, textAlign: 'center' },
    'center-right': { x: imageWidth - padding, y: (imageHeight - textHeight) / 2, textAlign: 'right' },
    'bottom-left': { x: padding, y: imageHeight - textHeight - padding, textAlign: 'left' },
    'bottom-center': { x: imageWidth / 2, y: imageHeight - textHeight - padding, textAlign: 'center' },
    'bottom-right': { x: imageWidth - padding, y: imageHeight - textHeight - padding, textAlign: 'right' },
    'tile': { x: imageWidth / 2, y: imageHeight / 2, textAlign: 'center' },
  };
  
  return positions[position] || positions['bottom-right'];
}

// ===================================
// MaklerPro Branding (Non-Premium)
// ===================================

function drawMaklerProBranding(
  ctx: CanvasRenderingContext2D,
  imageWidth: number,
  imageHeight: number
): void {
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#FFFFFF';
  
  const brandSize = Math.max(imageWidth, imageHeight) * 0.12;
  ctx.font = `bold ${brandSize}px Arial`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  
  ctx.translate(imageWidth / 2, imageHeight / 2);
  ctx.rotate(-45 * Math.PI / 180);
  
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = brandSize * 0.04;
  ctx.strokeText('MaklerPro', 0, 0);
  ctx.fillText('MaklerPro', 0, 0);
  
  ctx.restore();
}

// ===================================
// Batch Process with Custom Watermark
// ===================================

export async function processBatchWithWatermark(
  images: ImageFile[],
  watermarkConfig: CustomWatermarkConfig,
  enhancementConfig?: EnhancementConfig,
  onProgress?: BatchProgressCallback,
  maxConcurrent: number = 3
): Promise<BatchImageResult[]> {
  const queue = new ConcurrencyQueue(maxConcurrent);
  const results: BatchImageResult[] = images.map(img => ({
    imageId: img.id,
    imageName: img.name,
    status: 'pending' as const,
  }));

  const progress: BatchProgress = {
    total: images.length,
    completed: 0,
    successful: 0,
    failed: 0,
    currentImageName: '',
    results,
  };

  onProgress?.(progress);

  const tasks = images.map((image, index) => {
    return queue.add(async () => {
      results[index].status = 'processing';
      progress.currentImageName = image.name;
      onProgress?.({ ...progress, results: [...results] });

      try {
        let processedImage = image;

        // Step 1: Enhancement (if configured)
        if (enhancementConfig) {
          const enhanced = await enhanceImage(image, enhancementConfig);
          processedImage = {
            ...image,
            preview: enhanced.preview,
            width: enhanced.width,
            height: enhanced.height,
          };
        }

        // Step 2: Apply custom watermark
        const finalResult = await applyCustomWatermark(processedImage, watermarkConfig);

        results[index].status = 'success';
        results[index].result = finalResult;
        progress.successful++;

      } catch (error) {
        console.error(`Failed to process ${image.name}:`, error);
        results[index].status = 'error';
        results[index].error = error instanceof Error ? error.message : 'Unknown error';
        progress.failed++;
      } finally {
        progress.completed++;
        onProgress?.({ ...progress, results: [...results] });
      }
    });
  });

  await Promise.allSettled(tasks);

  progress.currentImageName = '';
  onProgress?.({ ...progress, results: [...results] });

  return results;
}
