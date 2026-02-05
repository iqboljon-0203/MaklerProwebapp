import { useState, useCallback, useEffect } from 'react';
import { useImageStore, useAppStore, useHistoryStore } from '@/store';
import { enhanceImage, getMagicFixPreset } from '@/services/imageService';
import { BeforeAfterComparison } from '@/components/ui/before-after';
import { Button } from '@/components/ui/button';
import { Sparkles, CheckCircle2, XCircle } from 'lucide-react';
import { useTelegram } from '@/hooks';
import { useFilePicker, useImageProcessor } from '@/hooks';

export function EnhanceEditor() {
  const { 
    images, 
    processedImages, 
    addProcessedImage 
  } = useImageStore();
  
  const { isProcessing, setProcessing, addToast } = useAppStore();
  const { processFiles } = useImageProcessor();
  
  const { openPicker, files, clearFiles } = useFilePicker({
    multiple: true,
    accept: 'image/*'
  });

  // Effect to process files when selected via the picker hook
  useEffect(() => {
    if (files.length > 0) {
      processFiles(files);
      clearFiles();
    }
  }, [files, processFiles, clearFiles]);
  
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const [enhancedPreview, setEnhancedPreview] = useState<string | null>(null);
  const [comparisonMode, setComparisonMode] = useState(false);

  // Get active image details
  const activeImage = images.find(img => img.id === activeImageId);

  const handleApplyMagicFix = useCallback(async () => {
    if (!activeImage) return;

    try {
      setProcessing(true);
      
      const config = getMagicFixPreset();
      const result = await enhanceImage(activeImage, config);
      
      setEnhancedPreview(result.preview);
      setComparisonMode(true);
      
      addToast({
        type: 'success',
        title: 'Magic Fix применен! ✨',
        message: 'Сравните результат До и После'
      });
      
    } catch (error) {
      console.error('Enhancement failed:', error);
      addToast({
        type: 'error',
        title: 'Ошибка',
        message: 'Не удалось улучшить изображение'
      });
    } finally {
      setProcessing(false);
    }
  }, [activeImage, setProcessing, addToast]);

  const handleSave = useCallback(async () => {
    if (!activeImage || !enhancedPreview) return;
    
    // In a real app, we might want to store the blob result persistently
    // For now we just "Save" logically to the processed store
    // Re-generating blob if needed or using the one from state if we kept it?
    // enhanceImage returns an object with blob. We should probably store that object in state if we want to save properly.
    
    // Optimized: Re-run enhance to get the full object or store it in state?
    // Let's re-run for simplicity unless we store the whole object in state.
    // Actually, saving to processedImages store is the goal.
    
    try {
        setProcessing(true);
        const config = getMagicFixPreset();
        const result = await enhanceImage(activeImage, config);
        addProcessedImage(result);
        
        // Save to history
        useHistoryStore.getState().addItem({
            type: 'image',
            title: 'Magic Fix - ' + activeImage.name,
            thumbnail: result.preview, // Preview URL for thumbnail
            data: result.blob, // Blob for upload!
        });
        
        addToast({
            type: 'success',
            title: 'Saqlandi',
            message: 'Rasm galereyaga qo\'shildi'
        });
        setComparisonMode(false);
        setEnhancedPreview(null);
    } catch (e) {
        console.error(e);
    } finally {
        setProcessing(false);
    }

  }, [activeImage, enhancedPreview, addProcessedImage, addToast, setProcessing]);

  const handleCancel = useCallback(() => {
    setComparisonMode(false);
    setEnhancedPreview(null);
  }, []);

  // Helper to select an image
  const selectImage = (id: string) => {
    setActiveImageId(id);
    setEnhancedPreview(null);
    setComparisonMode(false);
  };
  
  const { showMainButton, hideMainButton } = useTelegram();

  useEffect(() => {
    if (comparisonMode && activeImage) {
        showMainButton('Сохранить', handleSave);
    } else {
        hideMainButton();
    }
    return () => hideMainButton();
  }, [comparisonMode, activeImage, showMainButton, hideMainButton, handleSave]);

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[50vh]">
        <div className="mb-4 rounded-full bg-primary/10 p-6">
          <Sparkles className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-xl font-bold mb-2">Magic Fix</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Автоматическое улучшение яркости, контраста и насыщенности ваших фото.
        </p>
        <Button onClick={openPicker} size="lg" className="rounded-full">
          Выбрать фото
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Main Preview Area */}
      <div className="relative flex-1 min-h-[300px] w-full bg-black/5 rounded-2xl overflow-hidden border border-border/50">
        {activeImage ? (
          comparisonMode && enhancedPreview ? (
            <BeforeAfterComparison
              beforeImage={activeImage.preview}
              afterImage={enhancedPreview}
              className="h-full w-full aspect-auto"
            />
          ) : (
            <img
              src={activeImage.preview}
              alt="Original"
              className="w-full h-full object-contain"
            />
          )
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Выберите фото для улучшения
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4 p-4 bg-card rounded-xl border border-border/50 shadow-sm">
        {comparisonMode ? (
          <>
            <Button 
                variant="outline" 
                onClick={handleCancel}
                className="flex-1"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Отмена
            </Button>
            <Button 
                onClick={handleSave} 
                className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Сохранить
            </Button>
          </>
        ) : (
          <Button
            onClick={handleApplyMagicFix}
            disabled={!activeImage || isProcessing}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/20"
            size="lg"
          >
            {isProcessing ? 'Обработка...' : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Применить Magic Fix
              </>
            )}
          </Button>
        )}
      </div>

      {/* Thumbnails */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-2 px-1">
            <Button 
                variant="outline" 
                className="h-20 w-20 shrink-0 rounded-xl border-dashed"
                onClick={openPicker}
            >
                +
            </Button>
          {images.map((img) => (
            <button
              key={img.id}
              onClick={() => selectImage(img.id)}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                activeImageId === img.id
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={img.preview}
                alt="Thumbnail"
                className="h-full w-full object-cover"
              />
              {/* Indicator if already processed */}
              {processedImages.some(p => p.originalId === img.id) && (
                <div className="absolute top-1 right-1 h-3 w-3 rounded-full bg-green-500 ring-1 ring-white" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
