import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useHistoryStore, useAppStore, useUserStore } from '@/store';
import { useTelegram } from '@/hooks';
import { 
  generateDescription, 
  LimitExceededError, 
  getUsageStatus,
  copyToClipboard 
} from '@/services/aiService';
import { updateGenerations } from '@/services/userService';
import {
  copyToClipboard as copyText,
  shareToTelegram,
  shareToOLX,
  trackShareEvent,
  triggerHapticFeedback
} from '@/services/shareService';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  Loader2, 
  Copy, 
  Check, 
  Sparkles, 
  Crown,
  Zap,
  AlertCircle,
  Send,
  ExternalLink
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Platform = 'telegram' | 'instagram' | 'olx';

// ===================================
// Premium Modal Component
// ===================================

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function PremiumModal({ isOpen, onClose }: PremiumModalProps) {
  const { t } = useTranslation();
  const { webApp } = useTelegram();

  const handleUpgrade = () => {
    const paymentLink = "https://t.me/MaklerProSupportBot";
    if (webApp) {
      webApp.openTelegramLink(paymentLink);
    } else {
      window.open(paymentLink, '_blank');
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="p-6 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border-amber-500/30 shadow-2xl shadow-amber-500/10">
              {/* Decorative glow */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl" />
              
              {/* Icon */}
              <div className="relative flex justify-center mb-6">
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    repeatType: "reverse" 
                  }}
                  className="p-4 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 shadow-lg shadow-amber-500/30"
                >
                  <Crown className="h-10 w-10 text-white" />
                </motion.div>
              </div>

              {/* Content */}
              <div className="text-center space-y-3 mb-6">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent">
                  {t('premium.limit_reached')}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {t('premium.limit_desc')}
                </p>
              </div>

              {/* Features */}
              <div className="space-y-2 mb-6">
                {[
                  t('premium.features.unlimited'),
                  t('premium.features.4k'),
                  t('premium.features.watermark'),
                  t('premium.features.support')
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="h-4 w-4 text-amber-400" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              {/* Buttons */}
              <div className="space-y-3">
                <Button 
                  onClick={handleUpgrade}
                  className="w-full py-6 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-black font-bold text-base rounded-xl shadow-lg shadow-amber-500/25"
                >
                  <Crown className="mr-2 h-5 w-5" />
                  {t('premium.get_pro')} — 49,000 {t('common.sum')}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={onClose}
                  className="w-full text-gray-500 hover:text-gray-300"
                >
                  {t('common.later')}
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ===================================
// Usage Counter Component
// ===================================

interface UsageCounterProps {
  remaining: number;
  max: number;
  isPremium: boolean;
}

function UsageCounter({ remaining, max, isPremium }: UsageCounterProps) {
  const { t } = useTranslation();
  if (isPremium) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30">
        <Crown className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-xs font-bold text-amber-400">PREMIUM</span>
      </div>
    );
  }

  const percentage = (remaining / max) * 100;
  const isLow = remaining <= 2;

  return (
    <motion.div 
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
        isLow 
          ? 'bg-red-500/10 border-red-500/30' 
          : 'bg-emerald-500/10 border-emerald-500/30'
      }`}
      animate={isLow ? { scale: [1, 1.02, 1] } : {}}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      <Zap className={`h-3.5 w-3.5 ${isLow ? 'text-red-400' : 'text-emerald-400'}`} />
      <div className="flex items-center gap-1.5">
        <span className={`text-xs font-bold ${isLow ? 'text-red-400' : 'text-emerald-400'}`}>
          {remaining}/{max}
        </span>
        <span className="text-[10px] text-gray-500">{t('common.left')}</span>
      </div>
      {/* Mini progress bar */}
      <div className="w-10 h-1 bg-gray-700 rounded-full overflow-hidden">
        <motion.div 
          className={`h-full rounded-full ${isLow ? 'bg-red-400' : 'bg-emerald-400'}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </motion.div>
  );
}

// ===================================
// Loading State Component
// ===================================

function LoadingState() {
  const { t } = useTranslation();
  const messages = [
    t('modules.ai.loading.thinking'),
    t('modules.ai.loading.generating'),
    t('modules.ai.loading.almost_done')
  ];

  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3"
    >
      <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
      <AnimatePresence mode="wait">
        <motion.span
          key={messageIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-emerald-300"
        >
          {messages[messageIndex]}
        </motion.span>
      </AnimatePresence>
    </motion.div>
  );
}

// ===================================
// Smart Share Buttons Panel
// ===================================

interface ShareButtonsPanelProps {
  text: string;
  telegramId: string;
}

function ShareButtonsPanel({ text, telegramId }: ShareButtonsPanelProps) {
  const { t } = useTranslation();
  const [isCopying, setIsCopying] = useState(false);
  const [isSharingTelegram, setIsSharingTelegram] = useState(false);
  const [isSharingOLX, setIsSharingOLX] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopyDescription = async () => {
    setIsCopying(true);
    try {
      const result = await copyText(text);
      
      if (result.success) {
        setCopySuccess(true);
        triggerHapticFeedback('success');
        toast.success(t('common.copied') + '! ✓', {
          description: t('common.copied_desc'),
          icon: <Copy className="h-4 w-4" />,
        });
        
        // Track analytics
        if (telegramId) {
          trackShareEvent(telegramId, 'copy', true);
        }
        
        setTimeout(() => setCopySuccess(false), 2000);
      } else {
        toast.error(t('common.error'));
        triggerHapticFeedback('error');
      }
    } finally {
      setIsCopying(false);
    }
  };

  const handleShareTelegram = () => {
    setIsSharingTelegram(true);
    try {
      const result = shareToTelegram(text);
      
      if (result.success) {
        triggerHapticFeedback('success');
        toast.success(t('modules.ai.share.telegram_opened'), {
          description: t('modules.ai.share.select_chat'),
          icon: <Send className="h-4 w-4" />,
        });
        
        // Track analytics
        if (telegramId) {
          trackShareEvent(telegramId, 'telegram', true);
        }
      } else {
        toast.error(result.error || t('common.error'));
        triggerHapticFeedback('error');
      }
    } finally {
      setIsSharingTelegram(false);
    }
  };

  const handleShareOLX = async () => {
    setIsSharingOLX(true);
    try {
      toast.info(t('modules.ai.share.copying'), {
        description: t('modules.ai.share.redirecting_olx'),
        duration: 1500,
      });
      
      const result = await shareToOLX(text);
      
      if (result.success) {
        triggerHapticFeedback('success');
        toast.success(t('modules.ai.share.olx_opened'), {
          description: t('modules.ai.share.olx_desc'),
          icon: <ExternalLink className="h-4 w-4" />,
        });
        
        // Track analytics
        if (telegramId) {
          trackShareEvent(telegramId, 'olx', true);
        }
      } else {
        toast.error(result.error || t('common.error'));
        triggerHapticFeedback('error');
      }
    } finally {
      setIsSharingOLX(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-3"
    >
      {/* Section Label */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <span className="text-xs text-gray-500 uppercase tracking-wider">{t('modules.ai.share.title')}</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* Primary Copy Button */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={handleCopyDescription}
        disabled={isCopying}
        className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-bold text-base transition-all duration-200 shadow-lg ${
          copySuccess
            ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-emerald-500/25'
            : 'bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white shadow-blue-500/25 hover:shadow-blue-500/40'
        }`}
      >
        {isCopying ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : copySuccess ? (
          <>
            <Check className="h-5 w-5" />
            {t('common.copied')}!
          </>
        ) : (
          <>
            <Copy className="h-5 w-5" />
            {t('modules.ai.copy_text')}
          </>
        )}
      </motion.button>

      {/* Quick Share Buttons Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Telegram Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleShareTelegram}
          disabled={isSharingTelegram}
          className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold text-sm bg-[#229ED9] hover:bg-[#1E8BC3] text-white shadow-lg shadow-[#229ED9]/25 transition-all duration-200"
        >
          {isSharingTelegram ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Send className="h-4 w-4" />
              Telegram
            </>
          )}
        </motion.button>

        {/* OLX Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleShareOLX}
          disabled={isSharingOLX}
          className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-[#00A97F] to-[#00C896] hover:from-[#009970] hover:to-[#00B584] text-white shadow-lg shadow-[#00A97F]/25 transition-all duration-200"
        >
          {isSharingOLX ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <ExternalLink className="h-4 w-4" />
              OLX
            </>
          )}
        </motion.button>
      </div>

      {/* Tip */}
      <p className="text-center text-[10px] text-gray-500/70">
        💡 {t('modules.ai.share.tip')}
      </p>
    </motion.div>
  );
}

// ===================================
// Main Component
// ===================================

export function AiConverter() {
  const { t } = useTranslation();
  const { setProcessing, isProcessing } = useAppStore();
  const { user } = useUserStore();
  const { addItem } = useHistoryStore();
  const { hapticFeedback, user: telegramUser } = useTelegram();
  
  const [rawInput, setRawInput] = useState('');
  const [platform, setPlatform] = useState<Platform>('telegram');
  const [generatedText, setGeneratedText] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [usageStatus, setUsageStatus] = useState(() => getUsageStatus());

  // Update usage status when user changes
  useEffect(() => {
    setUsageStatus(getUsageStatus());
  }, [user.dailyGenerations, user.isPremium]);

  const handleGenerate = async () => {
    if (!rawInput.trim()) {
      toast.warning(t('modules.ai.enter_text'), {
        description: t('modules.ai.input_placeholder')
      });
      return;
    }

    try {
      setProcessing(true);
      hapticFeedback('impact');
      
      const result = await generateDescription(rawInput, platform);
      setGeneratedText(result);
      
      // Sync with Supabase (only for non-premium users)
      if (telegramUser?.id) {
        await updateGenerations(String(telegramUser.id), user.isPremium);
      }
      
      // Save to history
      addItem({
        type: 'text',
        title: `${platform.toUpperCase()} ${t('modules.ai.title')}`,
        data: result,
      });
      
      toast.success(t('common.success') + '! ✨', {
        description: t('modules.ai.success_desc')
      });
      hapticFeedback('notification');
      
    } catch (error) {
      console.error(error);
      
      if (error instanceof LimitExceededError) {
        // Show premium modal
        hapticFeedback('notification');
        setShowPremiumModal(true);
        return;
      }
      
      toast.error(t('common.error'), {
        description: error instanceof Error ? error.message : t('common.error')
      });
      hapticFeedback('notification');
    } finally {
      setProcessing(false);
    }
  };

  const handleRefine = async (instruction: string) => {
    if (!generatedText) return;

    try {
      setProcessing(true);
      hapticFeedback('impact');
      
      const result = await generateDescription(rawInput, platform, {
        previousText: generatedText,
        instruction
      });
      
      setGeneratedText(result);
      
      // Update usage if applicable
      if (telegramUser?.id) {
        await updateGenerations(String(telegramUser.id), user.isPremium);
      }
      
      toast.success(t('common.success') + '! ✨');
      hapticFeedback('notification');
      
    } catch (error) {
      console.error(error);
      
      if (error instanceof LimitExceededError) {
        hapticFeedback('notification');
        setShowPremiumModal(true);
        return;
      }
      
      toast.error(t('common.error'), {
        description: error instanceof Error ? error.message : t('common.error')
      });
      hapticFeedback('notification');
    } finally {
      setProcessing(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedText) return;
    
    const success = await copyToClipboard(generatedText);
    
    if (success) {
      setCopied(true);
      hapticFeedback('notification');
      toast.success(t('common.copied') + '!', {
        description: t('common.copied_desc'),
        icon: <Copy className="h-4 w-4" />
      });
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error(t('common.error'));
    }
  };

  const canGenerate = usageStatus.canGenerate;

  return (
    <>
      <div className="flex flex-col h-full space-y-4">
        
        {/* Usage Counter Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-200">{t('modules.ai.title')}</h2>
          <UsageCounter 
            remaining={usageStatus.remainingGenerations === Infinity ? 99 : usageStatus.remainingGenerations} 
            max={5}
            isPremium={usageStatus.isPremium}
          />
        </div>

        {/* Input Section */}
        <Card className="p-4 bg-[#1E1E1E] border-white/5">
          <Label className="text-gray-400 text-xs uppercase tracking-wider mb-2 block">
            {t('modules.ai.input_label')}
          </Label>
          <Textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder={t('modules.ai.input_placeholder')}
            className="min-h-[120px] bg-black/30 border-white/10 text-gray-200 placeholder:text-gray-600 resize-none transition-colors focus:border-emerald-500/50"
            disabled={isProcessing}
          />
          <div className="flex justify-end mt-2">
            <span className={`text-xs ${rawInput.length > 500 ? 'text-amber-400' : 'text-gray-500'}`}>
              {rawInput.length}/500
            </span>
          </div>
        </Card>

        {/* Platform Selector */}
        <Card className="p-4 bg-[#1E1E1E] border-white/5">
          <Label className="text-gray-400 text-xs uppercase tracking-wider mb-2 block">
            {t('modules.ai.platform')}
          </Label>
          <Select 
            value={platform} 
            onValueChange={(v) => setPlatform(v as Platform)}
            disabled={isProcessing}
          >
            <SelectTrigger className="bg-black/30 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="telegram">📱 Telegram</SelectItem>
              <SelectItem value="instagram">📸 Instagram</SelectItem>
              <SelectItem value="olx">🛒 OLX</SelectItem>
            </SelectContent>
          </Select>
        </Card>

        {/* Generate Button */}
        <motion.div whileTap={{ scale: 0.98 }}>
          <Button
            onClick={handleGenerate}
            disabled={isProcessing || !rawInput.trim() || !canGenerate}
            size="lg"
            className={`w-full py-6 font-bold rounded-2xl shadow-lg transition-all duration-300 ${
              canGenerate 
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-emerald-500/20'
                : 'bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black shadow-amber-500/20'
            }`}
          >
            {isProcessing ? (
              <LoadingState />
            ) : !canGenerate ? (
              <>
                <Crown className="mr-2 h-5 w-5" />
                {t('premium.get_pro')}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                {t('modules.ai.action')}
              </>
            )}
          </Button>
        </motion.div>

        {/* Low Usage Warning */}
        <AnimatePresence>
          {!usageStatus.isPremium && usageStatus.remainingGenerations <= 2 && usageStatus.remainingGenerations > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20"
            >
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200/80">
                {t('modules.ai.limit_warning', { count: usageStatus.remainingGenerations })}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result Section */}
        <AnimatePresence mode="wait">
          {generatedText && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="space-y-4"
            >
              <Card className="p-4 bg-[#1E1E1E] border-emerald-500/30">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-emerald-400 text-xs uppercase tracking-wider flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t('common.success')} ({platform.toUpperCase()})
                  </Label>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className={`transition-colors ${
                        copied 
                          ? 'text-emerald-400 bg-emerald-500/10' 
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <AnimatePresence mode="wait">
                        {copied ? (
                          <motion.div
                            key="check"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="flex items-center gap-1"
                          >
                            <Check className="h-4 w-4" />
                            <span className="text-xs">{t('common.copied')}</span>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="copy"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="flex items-center gap-1"
                          >
                            <Copy className="h-4 w-4" />
                            <span className="text-xs">{t('modules.ai.copy_text')}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Button>
                  </motion.div>
                </div>
                <div className="bg-black/30 p-4 rounded-xl border border-white/5 max-h-[300px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans leading-relaxed">
                    {generatedText}
                  </pre>
                </div>
              </Card>

              {/* Refinement Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Button 
                   variant="outline" 
                   onClick={() => handleRefine("Make it shorter")}
                   disabled={isProcessing}
                   className="bg-[#1E1E1E]/50 text-gray-300 hover:text-white border-white/10 hover:bg-white/5 h-10"
                >
                   ✂️ Qisqaroq
                </Button>
                <Button 
                   variant="outline" 
                   onClick={() => handleRefine("Make it longer and more detailed")}
                   disabled={isProcessing}
                   className="bg-[#1E1E1E]/50 text-gray-300 hover:text-white border-white/10 hover:bg-white/5 h-10"
                >
                   📝 Uzunroq
                </Button>
                <Button 
                   variant="outline" 
                   onClick={() => handleRefine("Make it more formal")}
                   disabled={isProcessing}
                   className="bg-[#1E1E1E]/50 text-gray-300 hover:text-white border-white/10 hover:bg-white/5 h-10"
                >
                   👔 Ekspert
                </Button>
                <Button 
                   variant="outline" 
                   onClick={() => handleRefine("Add more emojis")}
                   disabled={isProcessing}
                   className="bg-[#1E1E1E]/50 text-gray-300 hover:text-white border-white/10 hover:bg-white/5 h-10"
                >
                   😃 Emoji+
                </Button>
              </div>
              
              {/* Smart Share Buttons */}
              <ShareButtonsPanel 
                text={generatedText}
                telegramId={telegramUser?.id?.toString() || ''}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        <AnimatePresence>
          {!generatedText && !rawInput && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-center p-8"
            >
              <motion.div 
                className="p-6 rounded-full bg-emerald-500/10 mb-4"
                animate={{ 
                  scale: [1, 1.05, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 4, 
                  repeat: Infinity,
                  repeatType: "reverse" 
                }}
              >
                <FileText className="h-12 w-12 text-emerald-400" />
              </motion.div>
              <h3 className="text-lg font-bold text-gray-300 mb-2">{t('modules.ai.title')}</h3>
              <p className="text-gray-500 text-sm max-w-xs">
                {t('modules.ai.desc')}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Premium Modal */}
      <PremiumModal 
        isOpen={showPremiumModal} 
        onClose={() => setShowPremiumModal(false)} 
      />
    </>
  );
}
