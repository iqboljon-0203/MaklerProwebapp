import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Check, Zap, Sparkles, Shield, Loader2 } from 'lucide-react';
import { useTelegram } from '@/hooks';
import { useTranslation } from 'react-i18next';

// ===================================
// Types
// ===================================

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  telegramId: string;
}

const PREMIUM_PRICE = 49000; // UZS
const PREMIUM_PRICE_USD = 4; // ~4 USD

// ===================================
// Premium Modal Component
// ===================================

export function PremiumModal({ isOpen, onClose, telegramId: _telegramId }: PremiumModalProps) {
  const { t } = useTranslation();
  // Note: _telegramId will be used when payment API is integrated
  const { hapticFeedback, webApp } = useTelegram();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  // ===================================
  // Premium Features List
  // ===================================

  const PREMIUM_FEATURES = [
    {
      icon: Zap,
      title: t('premium.features.unlimited'),
      description: t('premium.features_desc.unlimited'),
    },
    {
      icon: Sparkles,
      title: t('premium.features.watermark'), // Using "Watermark o'chirish" or "Shaxsiy Watermark" contextually
      description: t('premium.features_desc.watermark'),
    },
    {
      icon: Shield,
      title: t('premium.features.no_branding'),
      description: t('premium.features_desc.branding_desc'),
    },
    {
      icon: Crown,
      title: t('premium.features.4k'),
      description: t('premium.features_desc.4k'),
    },
  ];

  // ===================================
  // Payment Methods
  // ===================================

  const PAYMENT_METHODS = [
    {
      id: 'payme',
      name: 'Payme',
      logo: '💳',
      available: false,
      comingSoon: true,
    },
    {
      id: 'click',
      name: 'Click',
      logo: '📱',
      available: false,
      comingSoon: true,
    },
    {
      id: 'telegram',
      name: 'Telegram Stars',
      logo: '⭐',
      available: true,
      comingSoon: false,
    },
  ];

  const handlePayment = async (methodId: string) => {
    if (!PAYMENT_METHODS.find(m => m.id === methodId)?.available) {
      hapticFeedback('notification', 'warning');
      return;
    }

    setSelectedMethod(methodId);
    setIsProcessing(true);
    hapticFeedback('impact', 'medium');

    try {
      if (methodId === 'telegram') {
        try {
          // 1. Get Invoice Link from our API
          const response = await fetch('/api/create-invoice', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              language_code: webApp?.initDataUnsafe?.user?.language_code || 'uz',
              user_id: webApp?.initDataUnsafe?.user?.id
            }),
          });
          
          if (!response.ok) throw new Error("Failed to create invoice");
          
          const { invoiceLink } = await response.json();
          
          // 2. Open Invoice natively
          if (invoiceLink) {
              if (webApp && webApp.openInvoice) {
                  webApp.openInvoice(invoiceLink, (status: string) => {
                      if (status === 'paid') {
                          webApp.showAlert("Premium muvaffaqiyatli faollashtirildi! 🎉");
                          hapticFeedback('notification', 'success');
                          onClose();
                      } else if (status === 'failed') {
                          hapticFeedback('notification', 'error');
                          webApp.showAlert("To'lov amalga oshmadi.");
                      }
                  });
              } else {
                   // Fallback for browser
                   window.location.href = invoiceLink;
              }
          }
        } catch (e) {
            console.error(e);
            webApp?.showAlert("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
        }
      } else {
        // PayMe / Click integration would go here
        webApp?.showAlert(
          `${methodId.toUpperCase()} ${t('premium.modal.coming_soon')}!`
        );
      }
    } catch (error) {
      console.error('Payment error:', error);
      hapticFeedback('notification', 'error');
    } finally {
      setIsProcessing(false);
      setSelectedMethod(null);
    }
  };

  const handleContactSupport = () => {
    hapticFeedback('impact', 'light');
    const supportLink = "https://t.me/MaklerProSupport";
    if (webApp && typeof webApp.openTelegramLink === 'function') {
      webApp.openTelegramLink(supportLink);
    } else {
      window.open(supportLink, '_blank');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:max-w-md md:w-full z-50 flex flex-col"
          >
            <div className="flex-1 bg-gradient-to-b from-[#1a1a2e] to-[#16162a] rounded-3xl border border-amber-500/30 shadow-2xl shadow-amber-500/10 overflow-hidden flex flex-col">
              {/* Header */}
              <div className="relative p-6 bg-gradient-to-r from-amber-600/20 via-yellow-500/20 to-amber-600/20">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="h-5 w-5 text-white/70" />
                </button>

                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg">
                    <Crown className="h-8 w-8 text-black" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Premium</h2>
                    <p className="text-amber-200/70 text-sm">{t('premium.modal.subtitle')}</p>
                  </div>
                </div>
              </div>

              {/* Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Features */}
                <div className="space-y-3">
                  {PREMIUM_FEATURES.map((feature, index) => (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3 p-3 rounded-xl bg-white/5"
                    >
                      <div className="p-2 rounded-lg bg-amber-500/20">
                        <feature.icon className="h-5 w-5 text-amber-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-white">{feature.title}</h4>
                        <p className="text-sm text-gray-400">{feature.description}</p>
                      </div>
                      <Check className="h-5 w-5 text-emerald-400 ml-auto flex-shrink-0" />
                    </motion.div>
                  ))}
                </div>

                {/* Price */}
                <div className="text-center py-4">
                  <div className="text-4xl font-bold text-white">
                    {PREMIUM_PRICE.toLocaleString()} <span className="text-lg text-gray-400">{t('common.sum')}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('premium.modal.price_month', { price: PREMIUM_PRICE_USD })}
                  </p>
                </div>

                {/* Payment Methods */}
                <div className="space-y-2">
                  <p className="text-sm text-gray-400 text-center mb-3">{t('premium.modal.select_payment')}</p>
                  
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => handlePayment(method.id)}
                      disabled={isProcessing || !method.available}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                        method.available
                          ? 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-amber-500/50'
                          : 'border-white/5 bg-white/[0.02] opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <span className="text-2xl">{method.logo}</span>
                      <span className="font-medium text-white">{method.name}</span>
                      
                      {method.comingSoon && (
                        <span className="ml-auto text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-400">
                          {t('premium.modal.coming_soon')}
                        </span>
                      )}
                      
                      {isProcessing && selectedMethod === method.id && (
                        <Loader2 className="ml-auto h-5 w-5 animate-spin text-amber-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/5 bg-black/20">
                <button
                  onClick={handleContactSupport}
                  className="w-full py-3 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {t('premium.modal.need_help')} <span className="text-amber-400">@MaklerProSupport</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default PremiumModal;
