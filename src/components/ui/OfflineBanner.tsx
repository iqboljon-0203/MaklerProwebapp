import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, AlertTriangle } from 'lucide-react';
import { useNetwork } from '@/hooks/useNetwork';

// ===================================
// Types
// ===================================

interface OfflineBannerProps {
  onRetry?: () => void;
  showSlowConnectionWarning?: boolean;
}

// ===================================
// Offline Banner Component
// ===================================

export function OfflineBanner({ 
  onRetry,
  showSlowConnectionWarning = true 
}: OfflineBannerProps) {
  const { isOnline, wasOffline, effectiveType } = useNetwork();
  
  const isSlowConnection = effectiveType === 'slow-2g' || effectiveType === '2g';

  // Determine what to show
  const showOffline = !isOnline;
  const showBackOnline = isOnline && wasOffline;
  const showSlowWarning = isOnline && !wasOffline && isSlowConnection && showSlowConnectionWarning;

  return (
    <AnimatePresence>
      {/* Offline Banner */}
      {showOffline && (
        <motion.div
          key="offline"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-[100] safe-area-top"
        >
          <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-4 py-3">
            <div className="flex items-center justify-center gap-3 max-w-lg mx-auto">
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.7, 1]
                }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity 
                }}
              >
                <WifiOff className="h-5 w-5" />
              </motion.div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  Siz hozir offlayn rejimdasiz
                </p>
                <p className="text-xs text-white/80">
                  Ba'zi funksiyalar cheklangan bo'lishi mumkin
                </p>
              </div>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors"
                >
                  Qayta urinish
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Back Online Banner */}
      {showBackOnline && (
        <motion.div
          key="back-online"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-[100] safe-area-top"
        >
          <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-3">
            <div className="flex items-center justify-center gap-3 max-w-lg mx-auto">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10 }}
              >
                <Wifi className="h-5 w-5" />
              </motion.div>
              <p className="text-sm font-medium">
                Internet qayta ulandi! ✓
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Slow Connection Warning */}
      {showSlowWarning && (
        <motion.div
          key="slow"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-[100] safe-area-top"
        >
          <div className="bg-gradient-to-r from-amber-500 to-yellow-500 text-black px-4 py-3">
            <div className="flex items-center justify-center gap-3 max-w-lg mx-auto">
              <AlertTriangle className="h-5 w-5" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  Sekin internet ulanish
                </p>
                <p className="text-xs text-black/70">
                  Rasmlar va videolar sekin yuklanishi mumkin
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ===================================
// Connection Status Indicator
// ===================================

interface ConnectionStatusProps {
  className?: string;
  showLabel?: boolean;
}

export function ConnectionStatus({ 
  className = '',
  showLabel = false 
}: ConnectionStatusProps) {
  const { isOnline, effectiveType } = useNetwork();

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (effectiveType === 'slow-2g' || effectiveType === '2g') return 'bg-amber-500';
    if (effectiveType === '3g') return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const getLabel = () => {
    if (!isOnline) return 'Offlayn';
    if (effectiveType === 'slow-2g') return 'Juda sekin';
    if (effectiveType === '2g') return '2G';
    if (effectiveType === '3g') return '3G';
    return 'Yaxshi';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <motion.div
        className={`w-2 h-2 rounded-full ${getStatusColor()}`}
        animate={!isOnline ? { scale: [1, 1.3, 1] } : {}}
        transition={{ duration: 1, repeat: Infinity }}
      />
      {showLabel && (
        <span className="text-xs text-gray-500">{getLabel()}</span>
      )}
    </div>
  );
}

// ===================================
// Floating Offline Indicator (Bottom)
// ===================================

export function OfflineFloatingIndicator() {
  const { isOnline } = useNetwork();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-900/90 backdrop-blur-lg rounded-full border border-red-500/30 shadow-xl">
            <WifiOff className="h-4 w-4 text-red-400" />
            <span className="text-sm text-white font-medium">Offlayn</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ===================================
// Default Export
// ===================================

export default OfflineBanner;
