import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useImageStore, useAppStore, useHistoryStore } from '@/store';
import { generateSlideshowLocal, type SlideshowProgress } from '@/services/slideshowServiceLocal';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Download, Loader2, Music, Video, Send, Sparkles, ImagePlus } from 'lucide-react';
import { useFilePicker, useImageProcessor } from '@/hooks';
import { sendFileToChat, getTelegramChatId } from '@/services/telegramService';
import type { TransitionType } from '@/types';
import { useTranslation } from 'react-i18next';

import { PremiumGate } from '@/components/features/PremiumGate';

export function SlideshowGenerator() {
  const { t } = useTranslation();
  const { 
    images, 
    processedImages,
    selectedIds
  } = useImageStore();
  
  const { isProcessing, setProcessing, addToast } = useAppStore();
  
  // Determine source images: prefer processed, fallback to original
  const sourceImages = selectedIds.length > 0 
    ? (processedImages.filter(img => selectedIds.includes(img.originalId)).length > 0
        ? processedImages.filter(img => selectedIds.includes(img.originalId))
        : images.filter(img => selectedIds.includes(img.id)))
    : (processedImages.length > 0 ? processedImages : images);

  // Video generation state
  const [duration, setDuration] = useState(3);
  const [transition, setTransition] = useState<TransitionType>('fade');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [progress, setProgressState] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // File picker for fallback
  const { processFiles } = useImageProcessor();
  const { openPicker, files, clearFiles } = useFilePicker({
    multiple: true,
    accept: 'image/*'
  });
  
  useEffect(() => {
    if (files.length > 0) {
      processFiles(files);
      clearFiles();
    }
  }, [files, processFiles, clearFiles]);

  const handleGenerate = async () => {
    if (sourceImages.length < 2) {
      addToast({ type: 'warning', title: t('common.warning'), message: t('modules.slideshow.min_images') });
      return;
    }

    try {
      setProcessing(true);
      setVideoUrl(null);
      setProgressState(0);
      
      // Use local (browser-based) video generation
      const blob = await generateSlideshowLocal({
        images: sourceImages,
        duration: duration,
        transition: transition,
        transitionDuration: 1,
        aspectRatio: '9:16',
        fps: 30,
        quality: 'medium'
      }, (p: SlideshowProgress) => {
         setProgressState(p.progress);
         setStatusMessage(p.message);
      });
      
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      
      // Save to history
      const reader = new FileReader();
      reader.onloadend = () => {
          useHistoryStore.getState().addItem({
              type: 'video',
              title: `${t('modules.slideshow.title')} (${sourceImages.length} ${t('common.image')})`,
              data: reader.result as string,
          });
      };
      reader.readAsDataURL(blob);
      
      addToast({ type: 'success', title: t('common.success'), message: t('common.saved_gallery') });
      
    } catch (error) {
      console.error(error);
      addToast({ type: 'error', title: t('common.error'), message: t('common.error') });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <PremiumGate featureName="Video Generator">
       <div className="flex flex-col h-full space-y-4 pb-24">
          {sourceImages.length === 0 ? (
             <div className="flex flex-col items-center justify-center p-8 text-center min-h-[60vh] animate-in fade-in zoom-in duration-500">
                 <motion.div 
                   className="mb-8 relative"
                   animate={{ 
                     y: [0, -10, 0],
                     rotate: [0, 5, -5, 0]
                   }}
                   transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                 >
                   <div className="absolute inset-0 bg-purple-500/30 blur-3xl rounded-full scale-150" />
                   <div className="relative bg-gradient-to-br from-purple-500 to-pink-500 p-8 rounded-[2rem] shadow-2xl shadow-purple-500/30 border border-white/20">
                     <Video className="h-16 w-16 text-white drop-shadow-md" />
                   </div>
                 </motion.div>
                 
                 <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                   {t('modules.slideshow.title')}
                 </h2>
                 
                 <p className="text-gray-400 mb-10 max-w-sm mx-auto leading-relaxed text-base">
                   {t('modules.slideshow.desc')}
                 </p>
                  <Button 
                      onClick={openPicker} 
                      size="lg" 
                      className="rounded-2xl bg-white text-black hover:bg-gray-100 dark:bg-white dark:text-black dark:hover:bg-gray-200 shadow-xl shadow-white/10 transition-all active:scale-95 text-base font-bold px-10 py-6 h-auto"
                  >
                     <ImagePlus className="mr-2 h-5 w-5" />
                     {t('modules.magic_fix.upload_title')}
                 </Button>
             </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-2">
                 <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-500/10 rounded-xl">
                      <Video className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h2 className="font-bold text-lg text-white leading-none">{t('modules.slideshow.title')}</h2>
                      <span className="text-xs text-gray-500">{sourceImages.length} {t('common.image')}</span>
                    </div>
                 </div>
                 <div className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-xs font-bold text-purple-400">
                    9:16 REELS
                 </div>
              </div>

              {/* Phone Preview Area */}
              <div className="flex-1 flex justify-center items-start pt-2 pb-6 min-h-[400px]">
                <div className="relative w-full max-w-[260px] aspect-[9/16] bg-black rounded-[2.5rem] border-[6px] border-gray-800 shadow-2xl ring-1 ring-white/10 overflow-hidden">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-6 bg-gray-800 rounded-b-xl z-20" />
                  
                  {/* Content */}
                  <div className="w-full h-full bg-gray-900 relative">
                    {videoUrl ? (
                        <video 
                           src={videoUrl} 
                           controls={false} // Custom controls or minimal default
                           className="w-full h-full object-cover" 
                           autoPlay 
                           loop
                           playsInline
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-100">
                            {isProcessing ? (
                                <div className="flex flex-col items-center gap-6">
                                    <div className="relative">
                                      <div className="absolute inset-0 bg-purple-500/30 blur-xl rounded-full" />
                                      <Loader2 className="h-12 w-12 animate-spin text-purple-500 relative z-10" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="font-mono text-2xl font-bold text-white tracking-widest">{Math.round(progress)}%</p>
                                        <p className="text-xs text-purple-300/70 uppercase tracking-wider">{statusMessage || t('common.processing')}</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 animate-pulse">
                                      <Play className="h-8 w-8 text-white/50 ml-1" />
                                    </div>
                                    <p className="text-gray-400 text-sm font-medium px-4">
                                      {t('modules.slideshow.generate')}
                                    </p>
                                </>
                            )}
                        </div>
                    )}
                    
                    {/* Pro Tip Overlay (Bottom) */}
                    {videoUrl && (
                      <div className="absolute bottom-16 left-4 right-4 animate-in slide-in-from-bottom-4 fade-in duration-700 delay-500">
                        <div className="bg-black/60 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                          <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="w-3 h-3 text-yellow-400" />
                            <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">Pro Tip</span>
                          </div>
                          <p className="text-[10px] text-gray-300 leading-tight">
                            {t('modules.slideshow.protip')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Controls (Bottom Sheet Style) */}
              <div className="bg-gray-900/90 backdrop-blur-xl border-t border-white/10 -mx-4 -mb-4 p-6 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] space-y-6">
                
                {/* Sliders Grid */}
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
                          <Label>{t('modules.slideshow.duration')}</Label>
                          <span className="text-purple-400">{duration}s</span>
                        </div>
                        <Slider 
                            value={[duration]} 
                            min={1} 
                            max={5} 
                            step={0.5} 
                            onValueChange={(vals) => setDuration(vals[0])}
                            className="[&_.bg-primary]:bg-purple-500"
                        />
                    </div>
                    
                    <div className="space-y-3">
                        <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                          {t('modules.slideshow.transition')}
                        </Label>
                        <Select value={transition} onValueChange={(v: TransitionType) => setTransition(v)}>
                            <SelectTrigger className="h-8 bg-white/5 border-white/10 text-xs text-white rounded-lg focus:ring-purple-500/20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-white/10 text-white">
                                <SelectItem value="fade">{t('modules.slideshow.fade')}</SelectItem>
                                <SelectItem value="slide-left">{t('modules.slideshow.slide_left')}</SelectItem>
                                <SelectItem value="zoom-in">{t('modules.slideshow.zoom')}</SelectItem>
                                <SelectItem value="none">{t('modules.slideshow.none')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Main Action Button */}
                <Button 
                    className={`w-full h-14 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-[0.98] ${
                      videoUrl 
                        ? 'bg-gradient-to-r from-gray-800 to-gray-700 text-white border border-white/10 hover:bg-gray-700'
                        : 'bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 text-white shadow-purple-500/25'
                    }`}
                    onClick={handleGenerate}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                        {t('common.processing')}...
                      </>
                    ) : (videoUrl ? (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        {t('common.regenerate')}
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-5 w-5 fill-current" />
                        {t('modules.slideshow.generate')}
                      </>
                    ))}
                </Button>
                
                {/* Action Buttons (Download/Send) */}
                <AnimatePresence>
                  {videoUrl && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="grid grid-cols-2 gap-3 pt-2"
                    >
                        <Button 
                            variant="outline" 
                            className="h-12 rounded-xl border-white/10 hover:bg-white/5 text-gray-300"
                            onClick={() => {
                                const a = document.createElement('a');
                                a.href = videoUrl;
                                a.download = `makler-pro-video-${Date.now()}.webm`;
                                a.click();
                            }}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            {t('common.download')}
                        </Button>
                        
                        <Button 
                            className="h-12 rounded-xl bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20 font-bold"
                            onClick={async () => {
                                try {
                                    setProcessing(true);
                                    const res = await fetch(videoUrl);
                                    const blob = await res.blob();
                                    const chatId = getTelegramChatId();
                                    
                                    if (!chatId) {
                                        toast.error(t('common.error'), {
                                            description: "Start the bot first!" 
                                        });
                                        return;
                                    }

                                    addToast({ type: 'info', title: t('common.processing'), message: t('modules.video_studio.sending_to_bot') });
                                    await sendFileToChat(blob, `video-${Date.now()}.webm`, chatId);
                                    addToast({ type: 'success', title: t('common.success'), message: t('modules.video_studio.sent_to_bot') });

                                } catch (e: any) {
                                    if (e.message === 'BOT_NOT_STARTED') {
                                        toast(t('modules.video_studio.bot_error'), {
                                            description: t('modules.video_studio.bot_start_msg'),
                                            action: {
                                                label: t('modules.video_studio.open_bot'),
                                                onClick: () => {
                                                    const botName = "MaklerProSupportBot"; 
                                                    if ((window as any).Telegram?.WebApp) {
                                                        (window as any).Telegram.WebApp.openTelegramLink(`https://t.me/${botName}`);
                                                    } else {
                                                        window.open(`https://t.me/${botName}`, '_blank');
                                                    }
                                                }
                                            },
                                            duration: 8000,
                                        });
                                    } else {
                                        addToast({ type: 'error', title: t('common.error'), message: t('modules.video_studio.send_error') });
                                    }
                                } finally {
                                    setProcessing(false);
                                }
                            }}
                        >
                            <Send className="mr-2 h-4 w-4" />
                            {t('modules.video_studio.send_to_bot')}
                        </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
       </div>
    </PremiumGate>
  );
}
