import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/store';
import { Wand2, Video, FileText, Palette, ChevronRight } from 'lucide-react';

export function Onboarding() {
  const { t } = useTranslation();
  const { setHasSeenOnboarding } = useSettingsStore();
  const [step, setStep] = useState(0);

  const steps = [
    {
      id: 'welcome',
      title: t('onboarding.welcome_title'),
      desc: t('onboarding.welcome_desc'),
      icon: <div className="text-6xl mb-4">🏠</div>,
      bg: 'from-blue-600/20 to-cyan-600/20'
    },
    {
      id: 'magic',
      title: t('onboarding.step1_title'),
      desc: t('onboarding.step1_desc'),
      icon: <Wand2 className="h-16 w-16 text-cyan-400 mb-4" />,
      bg: 'from-cyan-500/20 to-blue-500/20'
    },
    {
      id: 'video',
      title: t('onboarding.step2_title'),
      desc: t('onboarding.step2_desc'),
      icon: <Video className="h-16 w-16 text-purple-400 mb-4" />,
      bg: 'from-purple-500/20 to-pink-500/20'
    },
    {
      id: 'ai',
      title: t('onboarding.step3_title'),
      desc: t('onboarding.step3_desc'),
      icon: <FileText className="h-16 w-16 text-emerald-400 mb-4" />,
      bg: 'from-emerald-500/20 to-green-500/20'
    },
    {
      id: 'branding',
      title: t('onboarding.step4_title'),
      desc: t('onboarding.step4_desc'),
      icon: <Palette className="h-16 w-16 text-blue-400 mb-4" />,
      bg: 'from-blue-500/20 to-indigo-500/20'
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      setHasSeenOnboarding(true);
    }
  };

  const handleSkip = () => {
    setHasSeenOnboarding(true);
  };

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div 
        key={step}
        initial={{ opacity: 0, scale: 0.9, x: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.9, x: -20 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm bg-[#1A1A1A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* Visual Content */}
        <div className={`relative h-64 flex flex-col items-center justify-center bg-gradient-to-br ${currentStep.bg}`}>
          {currentStep.icon}
          
          {/* Progress Indicators */}
          <div className="absolute bottom-4 flex gap-1.5">
            {steps.map((_, i) => (
              <div 
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 bg-white' : 'w-1.5 bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Text Content */}
        <div className="p-6 text-center space-y-4">
          <h2 className="text-2xl font-bold text-white leading-tight">
            {currentStep.title}
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            {currentStep.desc}
          </p>
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex gap-3">
          {step < steps.length - 1 && (
            <Button 
              variant="ghost" 
              onClick={handleSkip}
              className="flex-1 text-gray-500 hover:text-white"
            >
              {t('onboarding.skip_btn')}
            </Button>
          )}
          
          <Button 
            onClick={handleNext}
            className={`flex-1 bg-white text-black hover:bg-gray-200 ${step === steps.length - 1 ? 'w-full' : ''}`}
          >
            {step === steps.length - 1 ? t('onboarding.start_btn') : t('onboarding.next_btn')}
            {step < steps.length - 1 && <ChevronRight className="ml-1 h-4 w-4" />}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
