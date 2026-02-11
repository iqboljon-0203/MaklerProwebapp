import { useUserStore } from '@/store';
import { useTelegram } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Crown, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PremiumGateProps {
  children: React.ReactNode;
  featureName?: string;
}

export function PremiumGate({ children, featureName }: PremiumGateProps) {
  const { t } = useTranslation();
  const { user } = useUserStore();
  const { webApp } = useTelegram();
  
  const displayFeatureName = featureName || t('common.this_feature');

  if (user.isPremium) {
    return <>{children}</>;
  }

  return (
    <div className="relative w-full h-full min-h-[300px]">
      {/* Blurred Content Placeholder */}
      <div className="absolute inset-0 blur-sm opacity-50 pointer-events-none select-none overflow-hidden" aria-hidden="true">
        {children}
      </div>

      {/* Lock Overlay */}
      <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
        <Card className="max-w-xs w-full p-6 text-center space-y-4 shadow-2xl border-yellow-500/20 bg-background/95 backdrop-blur-sm">
          <div className="mx-auto w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-500/20 flex items-center justify-center">
            <Lock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          
          <div className="space-y-2">
            <h3 className="font-bold text-lg">{t('premium.gate_title')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('premium.gate_desc', { feature: displayFeatureName })}
            </p>
          </div>

          <Button 
            className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-bold"
            onClick={() => {
                const paymentLink = "https://t.me/MaklerProSupportBot";
                if (webApp) {
                    webApp.openTelegramLink(paymentLink);
                } else {
                    window.open(paymentLink, '_blank');
                }
            }}
          >
            <Crown className="w-4 h-4 mr-2" />
            {t('premium.gate_cta')}
          </Button>
        </Card>
      </div>
    </div>
  );
}

