import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useImageStore, useAppStore, useHistoryStore } from '@/store';
import { 
  enhanceImage, 
  getMagicFixPreset, 
  processImagesBatch,
  getBatchSummary,
  type BatchProgress,
  type BatchImageResult
} from '@/services/imageService';
import { BeforeAfterComparison } from '@/components/ui/before-after';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ImageIcon,
  CheckCheck,
  AlertCircle,
  Zap,
  Download
} from 'lucide-react';
import { useTelegram } from '@/hooks';
import { useFilePicker, useImageProcessor } from '@/hooks';
import { useTranslation } from 'react-i18next';

// ===================================
// Progress Bar Component
// ===================================

interface BatchProgressBarProps {
  progress: BatchProgress;
}

function BatchProgressBar({ progress }: BatchProgressBarProps) {
  const { t } = useTranslation();
  const percentage = progress.total > 0 
    ? Math.round((progress.completed / progress.total) * 100) 
    : 0;

  return (
    <div className="space-y-3">
      {/* Progress header */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">{t('common.processing')}</span>
        <span className="font-mono text-emerald-400">
          {progress.completed}/{progress.total}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-500 to-green-500"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Current file */}
      {progress.currentImageName && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="truncate">{progress.currentImageName}</span>
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1 text-emerald-400">
          <CheckCircle2 className="h-3 w-3" />
          <span>{progress.successful} {t('common.success')}</span>
        </div>
        {progress.failed > 0 && (
          <div className="flex items-center gap-1 text-red-400">
            <XCircle className="h-3 w-3" />
            <span>{progress.failed} {t('common.error')}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================================
// Batch Results Component
// ===================================

interface BatchResultsProps {
  results: BatchImageResult[];
  onSaveAll: () => void;
  onDismiss: () => void;
}

function BatchResults({ results, onSaveAll, onDismiss }: BatchResultsProps) {
  const { t } = useTranslation();
  const summary = getBatchSummary(results);
  const hasSuccessful = summary.successful > 0;
  const hasFailed = summary.failed > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* Summary Card */}
      <Card className="p-4 bg-[#1E1E1E] border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-200">{t('common.success')}</h3>
          <span className="text-xs text-gray-500">
            {Math.round(summary.successRate)}% {t('common.success')}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-3 rounded-xl bg-gray-800/50">
            <div className="text-2xl font-bold text-white">{summary.total}</div>
            <div className="text-xs text-gray-500">{t('common.total')}</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-emerald-500/10">
            <div className="text-2xl font-bold text-emerald-400">{summary.successful}</div>
            <div className="text-xs text-emerald-500/70">{t('common.success')}</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-red-500/10">
            <div className="text-2xl font-bold text-red-400">{summary.failed}</div>
            <div className="text-xs text-red-500/70">{t('common.error')}</div>
          </div>
        </div>

        {/* Failed items list */}
        {hasFailed && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
            <div className="flex items-center gap-2 text-sm text-red-400 mb-2">
              <AlertCircle className="h-4 w-4" />
              <span>{t('common.error')}:</span>
            </div>
            <ul className="space-y-1 text-xs text-red-300/70">
              {results.filter(r => r.status === 'error').map(r => (
                <li key={r.imageId} className="truncate">
                  • {r.imageName}: {r.error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onDismiss}
            className="flex-1"
          >
            {t('common.close')}
          </Button>
          {hasSuccessful && (
            <Button
              onClick={onSaveAll}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600"
            >
              <Download className="mr-2 h-4 w-4" />
              {t('common.save')}
            </Button>
          )}
        </div>
      </Card>

      {/* Thumbnail grid of results */}
      <div className="grid grid-cols-4 gap-2">
        {results.map((result) => (
          <div
            key={result.imageId}
            className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
              result.status === 'success' 
                ? 'border-emerald-500/50' 
                : result.status === 'error'
                ? 'border-red-500/50'
                : 'border-gray-700'
            }`}
          >
            {result.result?.preview ? (
              <img
                src={result.result.preview}
                alt={result.imageName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-gray-600" />
              </div>
            )}
            {/* Status indicator */}
            <div className="absolute top-1 right-1">
              {result.status === 'success' && (
                <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </div>
              )}
              {result.status === 'error' && (
                <div className="h-5 w-5 rounded-full bg-red-500 flex items-center justify-center">
                  <XCircle className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ===================================
// Main Component
// ===================================

export function EnhanceEditor() {
  const { t } = useTranslation();
  const { 
    images, 
    processedImages, 
    addProcessedImage,
    selectedIds,
    toggleSelection,
    selectAll,
    deselectAll
  } = useImageStore();
  
  const { isProcessing, setProcessing, addToast } = useAppStore();
  const { addItem } = useHistoryStore();
  const { processFiles } = useImageProcessor();
  
  const { openPicker, files, clearFiles } = useFilePicker({
    multiple: true,
    accept: 'image/*'
  });

  // Local state
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const [enhancedPreview, setEnhancedPreview] = useState<string | null>(null);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [batchResults, setBatchResults] = useState<BatchImageResult[] | null>(null);

  // Effect to process files when selected via the picker hook
  useEffect(() => {
    if (files.length > 0) {
      processFiles(files);
      clearFiles();
    }
  }, [files, processFiles, clearFiles]);

  // Get active image details
  const activeImage = images.find(img => img.id === activeImageId);

  // Selected images for batch processing
  const selectedImages = useMemo(() => 
    images.filter(img => selectedIds.includes(img.id)),
    [images, selectedIds]
  );

  // ===================================
  // Single Image Processing
  // ===================================

  const handleApplyMagicFix = useCallback(async () => {
    if (!activeImage) return;

    try {
      setProcessing(true);
      
      const config = getMagicFixPreset();
      const result = await enhanceImage(activeImage, config);
      
      setEnhancedPreview(result.preview);
      setComparisonMode(true);
      
      toast.success(t('modules.magic_fix.title') + ' ' + t('common.success'), {
        description: t('modules.magic_fix.before') + ' / ' + t('modules.magic_fix.after')
      });
      
    } catch (error) {
      console.error('Enhancement failed:', error);
      toast.error(t('common.error'), {
        description: t('common.error')
      });
    } finally {
      setProcessing(false);
    }
  }, [activeImage, setProcessing, t]);

  const handleSave = useCallback(async () => {
    if (!activeImage || !enhancedPreview) return;
    
    try {
      setProcessing(true);
      const config = getMagicFixPreset();
      const result = await enhanceImage(activeImage, config);
      addProcessedImage(result);
      
      addItem({
        type: 'image',
        title: 'Magic Fix - ' + activeImage.name,
        thumbnail: result.preview,
        data: result.blob,
      });
      
      toast.success(t('common.success'), {
        description: t('common.success')
      });
      
      setComparisonMode(false);
      setEnhancedPreview(null);
    } catch (e) {
      console.error(e);
      toast.error(t('common.error'));
    } finally {
      setProcessing(false);
    }
  }, [activeImage, enhancedPreview, addProcessedImage, addItem, setProcessing, t]);

  const handleCancel = useCallback(() => {
    setComparisonMode(false);
    setEnhancedPreview(null);
  }, []);

  // ===================================
  // Batch Processing
  // ===================================

  const handleBatchProcess = useCallback(async () => {
    const imagesToProcess = selectedImages.length > 0 ? selectedImages : images;
    
    if (imagesToProcess.length === 0) {
      toast.warning(t('modules.magic_fix.upload_images'));
      return;
    }

    try {
      setProcessing(true);
      setBatchMode(true);
      setBatchResults(null);
      
      const config = getMagicFixPreset();
      
      const results = await processImagesBatch(
        imagesToProcess,
        config,
        (progress) => setBatchProgress(progress),
        3 // Max 3 concurrent operations for mobile safety
      );
      
      setBatchResults(results);
      
      const summary = getBatchSummary(results);
      
      if (summary.failed === 0) {
        toast.success(`${summary.successful} ${t('common.success')}! 🎉`);
      } else {
        toast.warning(`${summary.successful} ${t('common.success')}, ${summary.failed} ${t('common.error')}`);
      }
      
    } catch (error) {
      console.error('Batch processing failed:', error);
      toast.error(t('common.error'));
    } finally {
      setProcessing(false);
      setBatchProgress(null);
    }
  }, [images, selectedImages, setProcessing, t]);

  const handleSaveAllResults = useCallback(() => {
    if (!batchResults) return;

    const successfulResults = batchResults.filter(r => r.status === 'success' && r.result);
    
    successfulResults.forEach((r) => {
      if (r.result) {
        addProcessedImage(r.result);
        addItem({
          type: 'image',
          title: 'Magic Fix - ' + r.imageName,
          thumbnail: r.result.preview,
          data: r.result.blob,
        });
      }
    });

    toast.success(`${successfulResults.length} ${t('common.success')}`);
    setBatchResults(null);
    setBatchMode(false);
    deselectAll();
  }, [batchResults, addProcessedImage, addItem, deselectAll, t]);

  const handleDismissResults = useCallback(() => {
    setBatchResults(null);
    setBatchMode(false);
  }, []);

  // Helper to select an image
  const selectImage = (id: string) => {
    setActiveImageId(id);
    setEnhancedPreview(null);
    setComparisonMode(false);
    setBatchMode(false);
    setBatchResults(null);
  };
  
  const { showMainButton, hideMainButton } = useTelegram();

  useEffect(() => {
    if (comparisonMode && activeImage) {
      showMainButton(t('common.save'), handleSave);
    } else {
      hideMainButton();
    }
    return () => hideMainButton();
  }, [comparisonMode, activeImage, showMainButton, hideMainButton, handleSave, t]);

  // ===================================
  // Empty State
  // ===================================

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[50vh]">
        <motion.div 
          className="mb-4 rounded-full bg-primary/10 p-6"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Sparkles className="h-12 w-12 text-primary" />
        </motion.div>
        <h2 className="text-xl font-bold mb-2">Magic Fix</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">
          {t('modules.magic_fix.upload_desc')}
        </p>
        <Button onClick={openPicker} size="lg" className="rounded-full">
          {t('modules.magic_fix.upload_title')}
        </Button>
      </div>
    );
  }

  // ===================================
  // Batch Results View
  // ===================================

  if (batchResults) {
    return (
      <div className="flex flex-col h-full p-4">
        <BatchResults 
          results={batchResults}
          onSaveAll={handleSaveAllResults}
          onDismiss={handleDismissResults}
        />
      </div>
    );
  }

  // ===================================
  // Main View
  // ===================================

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Batch Mode Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-gray-200">Magic Fix</h2>
          {images.length > 1 && (
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
              {images.length} {t('common.total')?.toLowerCase() || 'rasm'}
            </span>
          )}
        </div>
        
        {images.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => selectedIds.length === images.length ? deselectAll() : selectAll()}
            className="text-xs text-gray-400"
          >
            {selectedIds.length === images.length ? t('common.cancel') : t('common.confirm')}
          </Button>
        )}
      </div>

      {/* Batch Progress */}
      <AnimatePresence>
        {batchProgress && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-4 bg-[#1E1E1E] border-emerald-500/20">
              <BatchProgressBar progress={batchProgress} />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

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
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <ImageIcon className="h-12 w-12 opacity-50" />
            <span>{t('modules.magic_fix.upload_desc')}</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 p-4 bg-card rounded-xl border border-border/50 shadow-sm">
        {comparisonMode ? (
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              className="flex-1"
            >
              <XCircle className="mr-2 h-4 w-4" />
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleSave} 
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {t('common.save')}
            </Button>
          </div>
        ) : (
          <>
            {/* Single image button */}
            {activeImage && (
              <Button
                onClick={handleApplyMagicFix}
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/20"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {t('common.processing')}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    {t('modules.magic_fix.action')}
                  </>
                )}
              </Button>
            )}

            {/* Batch process button */}
            {images.length > 1 && (
              <Button
                onClick={handleBatchProcess}
                disabled={isProcessing}
                variant={activeImage ? "outline" : "default"}
                className={`w-full ${!activeImage ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/20' : ''}`}
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {t('common.processing')}
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-5 w-5" />
                    {selectedIds.length > 0 
                      ? `${selectedIds.length} ${t('common.selected_images') || 'rasm'}`
                      : `${t('common.all') || 'Hammasi'} (${images.length})` // TODO: add to locale
                    }
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </div>

      {/* Thumbnails with selection */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-2 px-1">
          <Button 
            variant="outline" 
            className="h-20 w-20 shrink-0 rounded-xl border-dashed"
            onClick={openPicker}
          >
            +
          </Button>
          {images.map((img) => {
            const isSelected = selectedIds.includes(img.id);
            const isActive = activeImageId === img.id;
            const isProcessed = processedImages.some(p => p.originalId === img.id);

            return (
              <div key={img.id} className="relative shrink-0">
                {/* Selection checkbox for batch mode */}
                {images.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelection(img.id);
                    }}
                    className={`absolute -top-1 -left-1 z-10 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected 
                        ? 'bg-emerald-500 border-emerald-500' 
                        : 'bg-gray-800 border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {isSelected && <CheckCheck className="h-3 w-3 text-white" />}
                  </button>
                )}

                <button
                  onClick={() => selectImage(img.id)}
                  className={`relative h-20 w-20 overflow-hidden rounded-xl border-2 transition-all ${
                    isActive
                      ? 'border-primary ring-2 ring-primary/30'
                      : isSelected
                      ? 'border-emerald-500/50 opacity-90'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img.preview}
                    alt="Thumbnail"
                    className="h-full w-full object-cover"
                  />
                  {/* Processed indicator */}
                  {isProcessed && (
                    <div className="absolute top-1 right-1 h-3 w-3 rounded-full bg-green-500 ring-1 ring-white" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

}
