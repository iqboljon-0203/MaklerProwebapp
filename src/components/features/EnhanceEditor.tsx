import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useImageStore, useAppStore, useHistoryStore, useUserStore } from '@/store';
import { 
  enhanceImage, 
  getMagicFixPreset, 
  processImagesBatch,
  getBatchSummary,
  applyCustomWatermark,
  processBatchWithWatermark,
  type CustomWatermarkConfig,
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
  Download,
  Upload,
  ImagePlus
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
  const { user, branding } = useUserStore(); // Get user branding settings
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
  
  // State for optional watermark application
  const [applyWatermark, setApplyWatermark] = useState(branding.settings.enabled);

  // Sync with global setting when it changes
  useEffect(() => {
      setApplyWatermark(branding.settings.enabled);
  }, [branding.settings.enabled]);

  // Effect to process files when selected via the picker hook
  useEffect(() => {
    if (files.length > 0) {
      processFiles(files);
      clearFiles();
    }
  }, [files, processFiles, clearFiles]);

  // Auto-select first image if none is active
  useEffect(() => {
    if (!activeImageId && images.length > 0) {
      setActiveImageId(images[0].id);
    }
  }, [images, activeImageId]);

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
      
      // 1. Re-enhance to get fresh blob/result
      let result = await enhanceImage(activeImage, config);

      // 2. Apply Watermark if toggle is ON
      if (applyWatermark && branding.settings.enabled) {
          const watermarkConfig: CustomWatermarkConfig = {
              settings: branding.settings,
              textWatermark: branding.textWatermark,
              logoUrl: branding.customLogoUrl || undefined,
              isPremium: user.isPremium
          };
          
          // Wrap result as ImageFile for watermark function
          const imageFileWrapper = {
              ...activeImage,
              preview: result.preview, // Use enhanced preview
              width: result.width,
              height: result.height,
          };

          const watermarked = await applyCustomWatermark(imageFileWrapper, watermarkConfig);
          result = watermarked;
      }

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
  }, [activeImage, enhancedPreview, addProcessedImage, addItem, setProcessing, t, branding, user.isPremium, applyWatermark]);

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
      let results: BatchImageResult[];

      // Check if watermark is enabled via toggle AND global setting
      if (applyWatermark && branding.settings.enabled) {
          const watermarkConfig: CustomWatermarkConfig = {
              settings: branding.settings,
              textWatermark: branding.textWatermark,
              logoUrl: branding.customLogoUrl || undefined,
              isPremium: user.isPremium
          };

          results = await processBatchWithWatermark(
              imagesToProcess,
              watermarkConfig,
              config,
              (progress) => setBatchProgress(progress),
              3
          );
      } else {
          results = await processImagesBatch(
            imagesToProcess,
            config,
            (progress) => setBatchProgress(progress),
            3 // Max 3 concurrent operations for mobile safety
          );
      }
      
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
  }, [images, selectedImages, setProcessing, t, branding, user.isPremium, applyWatermark]);

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
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[60vh] animate-in fade-in zoom-in duration-500">
        <motion.div 
          className="mb-8 relative"
          animate={{ 
            y: [0, -10, 0],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="absolute inset-0 bg-blue-500/30 blur-3xl rounded-full scale-150" />
          <div className="relative bg-gradient-to-br from-blue-500 to-cyan-500 p-8 rounded-[2rem] shadow-2xl shadow-blue-500/30 border border-white/20">
            <ImagePlus className="h-16 w-16 text-white drop-shadow-md" />
          </div>
        </motion.div>
        
        <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          {t('modules.magic_fix.upload_title')}
        </h2>
        
        <p className="text-gray-400 mb-10 max-w-sm mx-auto leading-relaxed text-base">
          {t('modules.magic_fix.upload_desc')}
        </p>
        
        <Button 
          onClick={openPicker} 
          size="lg" 
          className="rounded-2xl bg-white text-black hover:bg-gray-100 dark:bg-white dark:text-black dark:hover:bg-gray-200 shadow-xl shadow-white/10 transition-all active:scale-95 text-base font-bold px-10 py-6 h-auto"
        >
          <Upload className="mr-2 h-5 w-5" />
          {t('common.upload')}
        </Button>
      </div>
    );
  }

  // ===================================
  // Batch Results View
  // ===================================

  if (batchResults) {
    return (
      <div className="flex flex-col h-full p-4 animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="text-emerald-500" />
            {t('common.completed')}
          </h2>
        </div>
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
    <div className="flex flex-col h-full space-y-4 pb-20">
      {/* Header & Batch Controls */}
      <div className="flex items-center justify-between px-2 py-2">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl transition-colors ${comparisonMode ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-400'}`}>
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-gray-100 leading-none">Magic Fix</h2>
            <p className="text-xs text-gray-500 mt-1">
              {images.length} {t('common.image')} • {selectedIds.length > 0 ? `${selectedIds.length} select` : 'All'}
            </p>
          </div>
        </div>
        
        {/* Branding Toggle */}
        {branding.settings.enabled && images.length > 0 && (
            <button
                onClick={() => setApplyWatermark(!applyWatermark)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    applyWatermark 
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                        : 'bg-white/5 text-gray-500 border border-white/10'
                }`}
            >
                <div className={`w-2 h-2 rounded-full ${applyWatermark ? 'bg-amber-400' : 'bg-gray-500'}`} />
                {applyWatermark ? 'Logo ON' : 'Logo OFF'}
            </button>
        )}

        {images.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => selectedIds.length === images.length ? deselectAll() : selectAll()}
            className="text-xs font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 h-8 px-3 rounded-lg ml-2"
          >
            {selectedIds.length === images.length ? t('common.cancel') : t('common.confirm')}
          </Button>
        )}
      </div>

      {/* Batch Progress Bar */}
      <AnimatePresence>
        {batchProgress && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            className="px-2"
          >
            <Card className="p-5 bg-gray-900/80 backdrop-blur-xl border-emerald-500/30 shadow-2xl shadow-emerald-500/10 rounded-2xl">
              <BatchProgressBar progress={batchProgress} />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Preview Area */}
      <div className="relative flex-1 min-h-[350px] w-full bg-black/40 rounded-3xl overflow-hidden border border-white/5 shadow-2xl backdrop-blur-sm group">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
        
        {activeImage ? (
          comparisonMode && enhancedPreview ? (
            <BeforeAfterComparison
              beforeImage={activeImage.preview}
              afterImage={enhancedPreview}
              className="h-full w-full aspect-auto"
            />
          ) : (
            <div className="relative w-full h-full p-4 flex items-center justify-center">
               <img
                src={activeImage.preview}
                alt="Original"
                className="w-full h-full object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]"
              />
              {/* Overlay Hint */}
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-medium text-gray-300 pointer-events-none">
                 Original
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
            <div className="p-6 rounded-full bg-white/5 border border-white/10">
               <ImageIcon className="h-10 w-10 opacity-50" />
            </div>
            <span className="text-sm font-medium">{t('modules.magic_fix.upload_desc')}</span>
          </div>
        )}
      </div>

      {/* Controls Bar (Floating) */}
      <div className="bg-gray-900/80 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-2xl">
        {comparisonMode ? (
          <div className="flex flex-col gap-3">
             {/* Branding Toggle in Comparison Mode */}
             {branding.settings.enabled && (
                <div className="flex items-center justify-center pb-2">
                    <button
                        onClick={() => setApplyWatermark(!applyWatermark)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            applyWatermark 
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' 
                                : 'bg-white/5 text-gray-400 border border-white/10'
                        }`}
                    >
                        {applyWatermark ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {applyWatermark ? 'Logotip qo\'shiladi' : 'Logotip qo\'shilmaydi'}
                    </button>
                </div>
             )}

             <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleCancel}
                  className="flex-1 rounded-xl h-12 border-white/10 hover:bg-white/5 hover:text-white"
                >
                  <XCircle className="mr-2 h-5 w-5" />
                  {t('common.cancel')}
                </Button>
                <Button 
                  onClick={handleSave} 
                  className="flex-[2] rounded-xl h-12 bg-gradient-to-r from-emerald-500 to-green-600 hover:shadow-lg hover:shadow-green-500/25 text-white font-bold"
                >
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  {t('common.save')}
                </Button>
             </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Single image main action */}
            {activeImage && (
              <Button
                onClick={handleApplyMagicFix}
                disabled={isProcessing}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white font-bold text-lg shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all active:scale-[0.98]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                    {t('common.processing')}...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-3 h-6 w-6" />
                    {t('modules.magic_fix.action')}
                  </>
                )}
              </Button>
            )}

            {/* Batch Action Button */}
            {images.length > 1 && (
              <Button
                onClick={handleBatchProcess}
                disabled={isProcessing}
                variant={activeImage ? "secondary" : "default"}
                className={`w-full h-12 rounded-xl font-semibold transition-all ${
                   !activeImage 
                     ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/20' 
                     : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5'
                }`}
              >
                {isProcessing && !activeImage ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Zap className={`mr-2 h-5 w-5 ${!activeImage ? 'text-white' : 'text-yellow-400'}`} />
                )}
                {selectedIds.length > 0 
                  ? `${selectedIds.length} ${t('common.selected_images')}`
                  : `${t('common.all')} (${images.length})`
                }
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Thumbnails Strip */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-950 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-950 to-transparent z-10 pointer-events-none" />
        
        <div className="overflow-x-auto pb-4 pt-2 -mx-4 px-4 scrollbar-hide">
          <div className="flex gap-3 px-2">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="h-20 w-20 shrink-0 rounded-2xl border-2 border-dashed border-gray-700 bg-gray-800/50 flex items-center justify-center hover:bg-gray-800 transition-colors hover:border-gray-500"
              onClick={openPicker}
            >
              <div className="flex flex-col items-center gap-1">
                <Upload className="h-6 w-6 text-gray-400" />
                <span className="text-[10px] text-gray-500 font-bold">ADD</span>
              </div>
            </motion.button>
            
            {images.map((img) => {
              const isSelected = selectedIds.includes(img.id);
              const isActive = activeImageId === img.id;
              const isProcessed = processedImages.some(p => p.originalId === img.id);

              return (
                <div key={img.id} className="relative shrink-0 group">
                  {/* Selection Checkbox */}
                  {images.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelection(img.id);
                      }}
                      className={`absolute -top-2 -right-2 z-20 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all shadow-md ${
                        isSelected 
                          ? 'bg-blue-500 border-blue-500 scale-110' 
                          : 'bg-gray-800 border-gray-600 hover:border-gray-400 scale-100 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {isSelected && <CheckCheck className="h-3.5 w-3.5 text-white" />}
                    </button>
                  )}

                  <motion.button
                    layoutId={`thumb-${img.id}`}
                    onClick={() => selectImage(img.id)}
                    className={`relative h-20 w-20 overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
                      isActive
                        ? 'border-blue-500 ring-4 ring-blue-500/20 scale-105 z-10'
                        : isSelected
                        ? 'border-blue-500/50 opacity-100'
                        : 'border-white/5 opacity-60 hover:opacity-100 hover:border-white/20'
                    }`}
                  >
                    <img
                      src={img.preview}
                      alt="Thumbnail"
                      className="h-full w-full object-cover"
                    />
                    
                    {/* Active Indicator */}
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-t from-blue-500/50 to-transparent opacity-30" />
                    )}
                    
                    {/* Processed Badge */}
                    {isProcessed && (
                      <div className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-green-500 ring-2 ring-black" />
                    )}
                  </motion.button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

}
