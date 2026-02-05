import imageCompression from 'browser-image-compression';
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
  const options = {
    maxWidthOrHeight: Math.max(config.maxWidth, config.maxHeight),
    initialQuality: config.quality,
    fileType: `image/${config.format}` as const,
    useWebWorker: true,
  };

  return await imageCompression(file, options);
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

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

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

// ===================================
// Canvas Utilities
// ===================================

export function createCanvas(
  width: number, 
  height: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
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

// ===================================
// Auto Enhancement Preset (Magic Fix)
// ===================================

export function getMagicFixPreset(): EnhancementConfig {
  return {
    brightness: 10,
    contrast: 20,
    saturation: 30,
    sharpness: 0,
  };
}
