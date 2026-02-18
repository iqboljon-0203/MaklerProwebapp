import { useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { useTelegram } from '@/hooks';
import { useAppStore, useUserStore, useHistoryStore, useSettingsStore } from '@/store';
import { getUserProfile } from '@/services/userService';
import { APP_NAME } from '@/constants';
import { ProcessingOverlay } from '@/components/ui/processing-overlay';
import { OfflineBanner } from '@/components/ui/OfflineBanner';

import { EnhanceEditor } from '@/components/features/EnhanceEditor';
import { SlideshowGenerator } from '@/components/features/SlideshowGenerator';
import { AiConverter } from '@/components/features/AiConverter';
import { Gallery } from '@/components/features/Gallery';
import { BrandingSettings } from '@/components/features/BrandingSettings';

import { Wand2, Video, FileText, ChevronLeft, ArrowRight, Palette, Zap } from 'lucide-react';
import { MaklerLogo } from '@/components/ui/MaklerLogo';
import { PremiumModal } from '@/components/features/PremiumModal';
import { Onboarding } from '@/components/features/Onboarding';
import { useTranslation } from 'react-i18next';

function App() {
  const { isDarkMode, currentView, setCurrentView } = useAppStore();
  const { user, setUser } = useUserStore();
  const { hasSeenOnboarding } = useSettingsStore();
  const { user: telegramUser, colorScheme, hapticFeedback, showBackButton, hideBackButton } = useTelegram();
  const { t } = useTranslation();
  
  // Premium Modal State
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialization
  useEffect(() => {
    // Sync Theme
    const root = document.documentElement;
    const shouldBeDark = colorScheme === 'dark' || isDarkMode;
    if (shouldBeDark) root.classList.add('dark');
    else root.classList.remove('dark');

    // Fetch User Profile
    const initUser = async () => {
        try {
            if (telegramUser) {
                const profile = await getUserProfile(telegramUser);
                setUser(profile);
                
                // Load History
                useHistoryStore.getState().loadHistory();
            }
        } catch (error) {
            console.error("Failed to init user:", error);
        } finally {
             // Add a small delay for smooth transition and ensuring fonts loaded
             setTimeout(() => setIsLoading(false), 500);
        }
    };
    initUser();

  }, [colorScheme, isDarkMode, telegramUser, setUser]);

  // Back Button Logic & Language Handling
  useEffect(() => {
    if (currentView !== 'home') {
      showBackButton(() => {
        hapticFeedback('selection');
        setCurrentView('home');
      });
    } else {
      hideBackButton();
    }
  }, [currentView, showBackButton, hideBackButton, hapticFeedback, setCurrentView]);

  const renderContent = () => {
    switch (currentView) {
      case 'enhance':
        return <EnhanceEditor />;
      case 'slideshow':
        return <SlideshowGenerator />;
      case 'ai-convert':
        return <AiConverter />;
      case 'gallery':
        return <Gallery />;
      case 'settings':
        return (
          <BrandingSettings 
            telegramId={telegramUser?.id?.toString() || 'unknown'} 
            onClose={() => setCurrentView('home')}
          />
        );
      case 'home':
      default:
        return <Dashboard 
          onViewChange={(view: any) => {
            hapticFeedback('selection');
            setCurrentView(view);
          }} 
          user={user} 
          onPremiumClick={() => {
            hapticFeedback('impact', 'medium');
            setIsPremiumModalOpen(true);
          }}
        />;
    }
  };

  if (isLoading) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-[#121212]">
        <div className="flex flex-col items-center gap-6">
           <div className="relative">
             <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full" />
             <MaklerLogo className="w-20 h-20 relative z-10 animate-pulse" />
           </div>
           
           <div className="flex gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '300ms' }} />
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-[#121212] text-gray-100 flex flex-col font-sans selection:bg-cyan-500/30 overflow-hidden">
      {/* Offline Banner */}
      <OfflineBanner />
      
      <ProcessingOverlay />
      
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#121212]/80 backdrop-blur-xl supports-[backdrop-filter]:bg-[#121212]/60">
        <div className="container flex h-16 items-center px-5 justify-between">
            <div className="flex items-center gap-3">
                {currentView !== 'home' ? (
                   <button 
                      onClick={() => setCurrentView('home')} 
                      className="p-2 -ml-2 rounded-full hover:bg-white/5 active:scale-95 transition-colors"
                   >
                      <ChevronLeft className="h-6 w-6 text-gray-400" />
                   </button>
                ) : (
                    <MaklerLogo className="h-9 w-9 shadow-[0_0_15px_rgba(59,130,246,0.5)] rounded-xl" />
                )}
                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                    {currentView === 'home' ? APP_NAME : 
                     currentView === 'enhance' ? t('modules.magic_fix.title') :
                     currentView === 'slideshow' ? t('modules.slideshow.title') :
                     currentView === 'ai-convert' ? t('modules.ai.title') :
                     currentView === 'gallery' ? t('modules.gallery.title') :
                     currentView === 'settings' ? t('modules.branding.title') : APP_NAME}
                </span>
            </div>
            
            {/* Account Status / Daily Limit */}
            <div className="flex flex-col items-end gap-0.5">
                {user.isPremium ? (
                    <div className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 flex items-center gap-1.5">
                         <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                         <span className="text-[10px] font-bold text-amber-400 tracking-wider">{t('common.premium_badge')}</span>
                    </div>
                ) : (
                    <div className="group flex items-center gap-3 px-3 py-1.5 bg-[#1E1E1E] border border-white/10 rounded-full shadow-sm">
                        {/* Single Line Text */}
                        <div className="flex items-center gap-2">
                             <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{t('common.daily_limit')}:</span>
                             <div className="flex items-baseline gap-0.5">
                                <span className={`text-sm font-bold ${user.dailyGenerations >= 5 ? 'text-red-500' : 'text-emerald-400'}`}>
                                    {Math.max(0, 5 - user.dailyGenerations)}
                                </span>
                                <span className="text-[10px] text-gray-600 font-medium">/5</span>
                             </div>
                        </div>
                        
                        {/* Radial Progress Mini */}
                        <div className="relative h-6 w-6 flex items-center justify-center">
                            {/* Background Ring */}
                            <div className="absolute inset-0 rounded-full border-2 border-white/5" />
                            
                            {/* Progress Ring */}
                            <svg className="h-full w-full -rotate-90">
                                 <circle 
                                    cx="12" cy="12" r="9" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2" 
                                    strokeDasharray="56.5" 
                                    strokeDashoffset={56.5 * (user.dailyGenerations / 5)} 
                                    strokeLinecap="round"
                                    className={`transition-all duration-500 ${user.dailyGenerations >= 5 ? 'text-red-500' : 'text-emerald-500'}`}
                                 />
                            </svg>
                            
                            {/* Icon in Center */}
                            <Zap className={`h-2.5 w-2.5 absolute ${user.dailyGenerations >= 5 ? 'text-red-500' : 'text-emerald-400'}`} fill="currentColor" />
                        </div>
                    </div>
                )}
            </div>
        </div>
      </header>

      {/* MainContent */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-4 pb-32 flex flex-col overflow-y-auto overscroll-contain">
        {renderContent()}
      </main>

      <Toaster position="top-center" theme="dark" richColors closeButton />

      {/* Onboarding */}
      {!hasSeenOnboarding && <Onboarding />}
      
      {/* Premium Modal */}
      <PremiumModal 
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
        telegramId={telegramUser?.id?.toString() || 'unknown'}
      />
    </div>
  );
}

function Dashboard({ onViewChange, user, onPremiumClick }: { 
  onViewChange: (view: any) => void, 
  user: any,
  onPremiumClick?: () => void 
}) {
    const { t } = useTranslation();

    const tools = [
        {
            id: 'enhance',
            title: t('modules.magic_fix.title'),
            desc: t('modules.magic_fix.desc'),
            icon: <Wand2 className="h-6 w-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />,
            color: 'group-hover:border-cyan-500/50',
            bg: 'from-cyan-500/10 to-blue-500/5',
        },
        {
            id: 'slideshow',
            title: t('modules.slideshow.title'),
            desc: t('modules.slideshow.desc'),
            icon: <Video className="h-6 w-6 text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.5)]" />,
            color: 'group-hover:border-purple-500/50',
            bg: 'from-purple-500/10 to-pink-500/5',
        },
        {
            id: 'ai-convert',
            title: t('modules.ai.title'),
            desc: t('modules.ai.desc'),
            icon: <FileText className="h-6 w-6 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />,
            color: 'group-hover:border-emerald-500/50',
            bg: 'from-emerald-500/10 to-green-500/5',
        },
        {
            id: 'gallery',
            title: t('modules.gallery.title'),
            desc: t('modules.gallery.desc'),
            icon: <div className="h-6 w-6 rounded-full border-2 border-amber-500/50 flex items-center justify-center text-amber-400"><span className="text-sm">📸</span></div>,
            color: 'group-hover:border-amber-500/50',
            bg: 'from-amber-500/10 to-yellow-500/5',
        },
        {
            id: 'settings',
            title: t('modules.branding.title'),
            desc: t('modules.branding.desc'),
            icon: <Palette className="h-6 w-6 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />,
            color: 'group-hover:border-blue-500/50',

            bg: 'from-blue-500/10 to-indigo-500/5',
            span: 'col-span-2'
        }
    ];

    return (
        <div className="flex flex-col h-full space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Hero Text */}
            <div className="shrink-0 space-y-0.5">
                <h1 className="text-2xl font-bold bg-gradient-to-br from-white via-gray-100 to-gray-500 bg-clip-text text-transparent">
                    {t('common.dashboard')}
                </h1>
                <p className="text-gray-500 text-xs font-light">{t('common.select_tool')}</p>
            </div>

            {/* Grid - Flexible Height */}
            <div className="flex-1 grid grid-cols-2 gap-2 min-h-0">
                {tools.map((tool) => (
                    <button
                        key={tool.id}
                        onClick={() => onViewChange(tool.id)}
                        className={`group relative h-full p-3 flex flex-col justify-between items-start rounded-2xl border border-white/5 bg-[#1E1E1E] transition-all duration-300 hover:scale-[1.02] active:scale-95 ${tool.color} text-left overflow-hidden ${tool.span || 'col-span-1'}`}
                    >
                         {/* Subtle Gradient BG */}
                         <div className={`absolute inset-0 bg-gradient-to-br ${tool.bg} opacity-20 group-hover:opacity-40 transition-opacity`} />
                         
                         {/* Icon Box */}
                         <div className="relative p-2.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/5 group-hover:bg-white/10 transition-colors">
                             {tool.icon}
                         </div>

                         {/* Text */}
                         <div className="relative z-10 w-full mt-1.5">
                             <h3 className="font-bold text-sm text-gray-100 leading-tight">{tool.title}</h3>
                             <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mt-0.5">{tool.desc}</p>
                         </div>
                    </button>
                ))}
            </div>
            
            {!user.isPremium && (
                <div className="shrink-0 relative overflow-hidden rounded-2xl p-4 border border-amber-500/30 shadow-lg shadow-amber-900/10">
                    {/* Animated Golden Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#2a1b0a] via-[#452c0f] to-[#1a1005]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.15),transparent_50%)]" />
                    
                    <div className="relative z-10 flex items-center justify-between gap-3"> 
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xl">👑</span>
                                <h3 className="text-base font-bold text-amber-100 truncate">{t('premium.upgrade_title')}</h3>
                            </div>
                            <p className="text-amber-200/70 text-xs leading-tight truncate">
                                {t('premium.upgrade_desc')}
                            </p>
                        </div>

                        <button 
                            onClick={onPremiumClick}
                            className="shrink-0 px-4 py-2 bg-[#FFD700] hover:bg-[#FFC000] active:scale-[0.95] text-black font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(255,215,0,0.2)] transition-all flex items-center gap-1.5"
                        >
                            <span>{t('premium.cta').split(' - ')[0]}</span>
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* Legal Footer */}
            <div className="shrink-0 flex items-center justify-center gap-4 py-2 opacity-30 hover:opacity-80 transition-opacity">
                <a href="https://telegra.ph/MaklerPro---Maxfiylik-Siyosati-02-18" target="_blank" rel="noreferrer" className="text-[9px] text-gray-500 hover:text-gray-300 transition-colors uppercase font-bold tracking-widest">{t('common.privacy')}</a>
                <span className="w-0.5 h-0.5 rounded-full bg-gray-700" />
                <a href="https://telegra.ph/MaklerPro---Foydalanish-Shartlari-02-18" target="_blank" rel="noreferrer" className="text-[9px] text-gray-500 hover:text-gray-300 transition-colors uppercase font-bold tracking-widest">{t('common.terms')}</a>
            </div>
        </div>
    )
}

export default App;
