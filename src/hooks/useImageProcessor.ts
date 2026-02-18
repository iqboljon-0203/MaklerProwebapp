import { useCallback } from 'react';
import { useImageStore, useAppStore, useSettingsStore, useUserStore } from '@/store';
import { processImagesInQueue, getMagicFixPreset } from '@/services/imageService';
import { compressImage } from '@/utils/image';
import type { ImageFile } from '@/types';

export function useImageProcessor() {
  const { 
    addImages, 
    addProcessedImage 
  } = useImageStore();
  
  const { 
    setProcessing, 
    setProgress, 
    addToast
  } = useAppStore();
  
  const { user } = useUserStore();
  
  const { compressionConfig, watermarkConfig } = useSettingsStore();

  const processFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    setProcessing(true);
    
    // Compress images first to prevent memory crash
    const compressedFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
        setProgress({
            current: i + 1,
            total: files.length,
            status: 'processing',
            message: `Optimizing ${i + 1}/${files.length}...`
        });
        const compressed = await compressImage(files[i]);
        compressedFiles.push(compressed);
    }
    
    try {
        const results = await processImagesInQueue(
            compressedFiles,
            {
                compression: compressionConfig,
                enhancement: getMagicFixPreset(), // Auto-apply Magic Fix as requested
                watermark: watermarkConfig,
                isPremium: user.isPremium
            },
            (progress) => {
                setProgress({
                    current: progress.current,
                    total: progress.total,
                    status: 'processing',
                    message: progress.status
                });
            }
        );

        // Batch update store
        const originals: ImageFile[] = [];
        
        results.forEach(({ original, processed }) => {
            if (original) originals.push(original);
            if (processed) addProcessedImage(processed);
        });

        if (originals.length > 0) {
            addImages(originals);
        }

        setProgress({
            current: files.length,
            total: files.length,
            status: 'completed',
            message: 'Готово!',
        });
        
        addToast({
            type: 'success',
            title: 'Загрузка завершена',
            message: `Обработано ${results.length} фото`,
        });

    } catch (error) {
        console.error('Processing error:', error);
        addToast({
            type: 'error',
            title: 'Ошибка',
            message: 'Не удалось обработать файлы',
        });
    } finally {
        setTimeout(() => setProcessing(false), 1000);
    }
  }, [compressionConfig, watermarkConfig, user.isPremium, addImages, addProcessedImage, setProcessing, setProgress, addToast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      processFiles(selectedFiles);
      e.target.value = '';
    }
  }, [processFiles]);

  return {
    handleFileSelect,
    processFiles,
  };
}
