import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useImageStore, useAppStore, useHistoryStore } from '@/store';
import { generateSlideshowLocal, type SlideshowProgress } from '@/services/slideshowServiceLocal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Download, Loader2, Music, Video, Send } from 'lucide-react';
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
              title: `${t('modules.slideshow.title')} (${sourceImages.length} ${t('common.total')?.toLowerCase() || 'rasm'})`,
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
       <div className="flex flex-col h-full space-y-4">
          {sourceImages.length === 0 ? (
             <div className="flex flex-col items-center justify-center p-8 text-center min-h-[50vh]">
                 <div className="mb-4 rounded-full bg-primary/10 p-6">
                     <Video className="h-12 w-12 text-primary" />
                 </div>
                 <h2 className="text-xl font-bold mb-2">{t('modules.slideshow.title')}</h2>
                 <p className="text-muted-foreground mb-6 max-w-sm">
                     {t('modules.slideshow.desc')}
                 </p>
                  <Button onClick={openPicker} size="lg" className="rounded-full">
                     {t('modules.magic_fix.upload_title')}
                 </Button>
             </div>
          ) : (
            <>
              {/* Preview Area */}
              <div className="relative flex-1 w-full bg-black/90 rounded-2xl overflow-hidden border border-border/50 flex items-center justify-center aspect-[9/16] max-h-[60vh] mx-auto shadow-2xl">
                {videoUrl ? (
                    <div className="relative w-full h-full">
                         <video 
                            src={videoUrl} 
                            controls 
                            className="w-full h-full object-cover" 
                            autoPlay 
                            loop
                         />
                         {/* Overlay Text */}
                         <div className="absolute bottom-16 left-0 right-0 px-4 text-center pointer-events-none">
                            <div className="bg-black/60 backdrop-blur-md text-white text-sm py-2 px-4 rounded-xl border border-white/20 inline-block text-left animate-in fade-in slide-in-from-bottom-2">
                                <div className="flex items-center gap-2 mb-1 text-yellow-400 font-bold">
                                    <Music size={14} /> 
                                    <span>Pro-Tip:</span>
                                </div>
                                <p className="opacity-90 leading-tight text-xs">
                                  {t('modules.slideshow.protip')}
                                </p>
                            </div>
                         </div>
                    </div>
                ) : (
                    <div className="text-center p-6 text-white/50">
                        {isProcessing ? (
                            <div className="flex flex-col items-center gap-4">
                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                <div className="space-y-1">
                                    <p className="font-medium text-white">{Math.round(progress)}%</p>
                                    <p className="text-xs">{statusMessage}</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <Play className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>{t('modules.slideshow.generate')}</p>
                                <p className="text-xs mt-2 opacity-60">{sourceImages.length} {t('common.selected_images') || 'rasm'}</p>
                            </>
                        )}
                    </div>
                )}
              </div>

              {/* Controls */}
              <Card className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>{t('modules.slideshow.duration')}</Label>
                        <div className="flex items-center gap-2">
                            <Slider 
                                value={[duration]} 
                                min={1} 
                                max={5} 
                                step={0.5} 
                                onValueChange={(vals) => setDuration(vals[0])}
                                className="flex-1"
                            />
                            <span className="text-sm font-mono w-8">{duration}s</span>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label>{t('modules.slideshow.transition')}</Label>
                        <Select value={transition} onValueChange={(v: TransitionType) => setTransition(v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="fade">{t('modules.slideshow.fade')}</SelectItem>
                                <SelectItem value="slide-left">{t('modules.slideshow.slide_left')}</SelectItem>
                                <SelectItem value="zoom-in">{t('modules.slideshow.zoom')}</SelectItem>
                                <SelectItem value="none">{t('modules.slideshow.none')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Button 
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20"
                    size="lg"
                    onClick={handleGenerate}
                    disabled={isProcessing}
                >
                    {isProcessing ? t('common.processing') : (videoUrl ? t('common.regenerate') : t('modules.slideshow.generate'))}
                </Button>
                
                {videoUrl && (
                    <div className="grid grid-cols-2 gap-3">
                        <Button 
                            variant="outline" 
                            className="w-full"
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
                            variant="secondary" 
                            className="w-full bg-blue-100 text-blue-700 hover:bg-blue-200"
                            onClick={async () => {
                                try {
                                    setProcessing(true);
                                    const res = await fetch(videoUrl);
                                    const blob = await res.blob();
                                    const chatId = getTelegramChatId();
                                    
                                    if (!chatId) {
                                        // Specific toast for missing Chat ID (Web vs Telegram)
                                        toast.error(t('common.error'), {
                                            description: "Iltimos, ilovani Telegram Bot orqali oching" // TODO: translate
                                        });
                                        return;
                                    }

                                    addToast({ type: 'info', title: t('common.processing'), message: 'Video botga yuklanmoqda...' });
                                    
                                    // sendFileToChat throws if error occurs
                                    await sendFileToChat(blob, `video-${Date.now()}.webm`, chatId);
                                    
                                    addToast({ type: 'success', title: t('common.success'), message: 'Video botga yuborildi' });

                                } catch (e: any) {
                                    if (e.message === 'BOT_NOT_STARTED') {
                                        // Custom Toast with Action to Open Bot
                                        toast("Botga xabar yubora olmadik", {
                                            description: "Iltimos, avval botimizga kirib /start tugmasini bosing va qayta urinib ko'ring.",
                                            action: {
                                                label: "Botni ochish",
                                                onClick: () => {
                                                    const botName = "MaklerProSupportBot"; // Replace with actual bot if different
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
                                        addToast({ type: 'error', title: t('common.error'), message: 'Fayl yuborilmadi' });
                                    }
                                } finally {
                                    setProcessing(false);
                                }
                            }}
                        >
                            <Send className="mr-2 h-4 w-4" />
                            Botga yuborish
                        </Button>
                    </div>
                )}
              </Card>
              
              {/* Thumbnails (for context) */}
              <div className="overflow-x-auto pb-2 px-1">
                  <div className="flex gap-2">
                    {sourceImages.map(img => (
                        <div key={img.id} className="relative h-12 w-12 shrink-0 rounded-md overflow-hidden bg-muted">
                            <img src={img.preview} className="h-full w-full object-cover" alt="" />
                        </div>
                    ))}
                  </div>
              </div>
            </>
          )}
       </div>
    </PremiumGate>
  );
}
