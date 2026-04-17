import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useImageStore, useAppStore, useSettingsStore, useUserStore } from '@/store';
import { processImagesInQueue, getMagicFixPreset } from '@/services/imageService';
import { compressImage } from '@/utils/image';
import { toast } from 'sonner';
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
  const { t } = useTranslation();

  const processFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    setProcessing(true);
    
    // Limit batch size
    if (files.length > 20) {
        toast.error('Limit exceeded', { 
            description: `Maximum 20 images allowed at once. Please split your upload.` 
        });
        setProcessing(false);
        return;
    }

    // Phase 1: Pre-Process (Size validation & Pre-compression)
    const compressedFiles: File[] = [];
    const skippedFiles: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
        const currentFile = files[i];

        // 25MB Hard limit for memory safety
        if (currentFile.size > 25 * 1024 * 1024) {
             skippedFiles.push(currentFile.name);
             continue; 
        }
    
        setProgress({
            current: i + 1,
            total: files.length,
            status: 'processing',
            message: `📦 ${t('common.processing')} ${i + 1}/${files.length}...`
        });

        const compressed = await compressImage(currentFile);
        compressedFiles.push(compressed);
    }

    // Show skipped files summary if any
    if (skippedFiles.length > 0) {
        toast.warning(`${skippedFiles.length} files skipped`, {
            description: `Files exceeded 25MB: ${skippedFiles.join(', ')}`
        });
    }
    
    if (compressedFiles.length === 0) {
      setProcessing(false);
      return;
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
            title: t('common.success'),
            message: `✨ ${results.length} photos ready!`,
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
