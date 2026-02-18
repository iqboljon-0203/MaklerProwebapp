import imageCompression from 'browser-image-compression';

/**
 * Compresses an image file to reduce size and memory usage.
 * Uses browser-image-compression library.
 * 
 * @param file - The original image file
 * @returns Promise resolving to the compressed File
 */
export const compressImage = async (file: File): Promise<File> => {
  // Config for compression
  const options = {
    maxSizeMB: 1.5,          // Max size ~1.5MB (good balance)
    maxWidthOrHeight: 2048,  // Max dimension 2K (enough for mobile/social)
    useWebWorker: true,      // Run in background thread
    fileType: 'image/jpeg' as const, // Standardize to JPEG
    initialQuality: 0.85,    // High quality
  };

  try {
    // Check if file is already small enough
    if (file.size / 1024 / 1024 < 1.5) {
        return file;
    }

    console.log(`Compressing ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)...`);
    const compressedFile = await imageCompression(file, options);
    console.log(`Compressed to ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
    
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed for:', file.name, error);
    return file; // Fallback to original
  }
};
