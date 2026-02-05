import { useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { useTelegram } from '@/hooks';
import { useAppStore, useUserStore } from '@/store';
import { getUserProfile } from '@/services/userService';
import { APP_NAME } from '@/constants';
import { ProcessingOverlay } from '@/components/ui/processing-overlay';

import { EnhanceEditor } from '@/components/features/EnhanceEditor';
import { SlideshowGenerator } from '@/components/features/SlideshowGenerator';
import { AiConverter } from '@/components/features/AiConverter';

import { Home, Wand2, Video, FileText, Menu, ChevronLeft, ArrowRight } from 'lucide-react';
import { MaklerLogo } from '@/components/ui/MaklerLogo';

function App() {
  const { isDarkMode, currentView, setCurrentView } = useAppStore();
  const { user, setUser } = useUserStore();
  const { user: telegramUser, colorScheme, hapticFeedback, showBackButton, hideBackButton } = useTelegram();

  // Initialization
  useEffect(() => {
    // Sync Theme
    const root = document.documentElement;
    const shouldBeDark = colorScheme === 'dark' || isDarkMode;
    if (shouldBeDark) root.classList.add('dark');
    else root.classList.remove('dark');

    // Fetch User Profile
    const initUser = async () => {
        if (telegramUser) {
            const profile = await getUserProfile(telegramUser);
            setUser(profile);
        }
    };
    initUser();

  }, [colorScheme, isDarkMode, telegramUser, setUser]);

  // Back Button Logic
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
      case 'home':
      default:
        return <Dashboard onViewChange={(view: any) => {
            hapticFeedback('selection');
            setCurrentView(view);
        }} user={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-gray-100 flex flex-col font-sans selection:bg-cyan-500/30">
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
                     currentView === 'enhance' ? 'Magic Fix' :
                     currentView === 'slideshow' ? 'Video Studio' :
                     currentView === 'ai-convert' ? 'AI Writer' : APP_NAME}
                </span>
            </div>
            
            {/* Account Status / Daily Limit */}
            <div className="flex flex-col items-end gap-0.5">
                {user.isPremium ? (
                    <div className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 flex items-center gap-1.5">
                         <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                         <span className="text-[10px] font-bold text-amber-400 tracking-wider">PREMIUM</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-end">
                       <span className="text-[10px] text-gray-400 font-medium mb-1">Daily Limit</span>
                       <div className="h-1.5 w-24 bg-gray-800 rounded-full overflow-hidden border border-white/5">
                           <div 
                              className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full" 
                              style={{ width: `${(Math.min(user.dailyGenerations, 5) / 5) * 100}%` }} 
                           />
                       </div>
                    </div>
                )}
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container px-5 py-6 overflow-y-auto pb-32">
        {renderContent()}
      </main>

      {/* Floating Bottom Navigation (Glass) */}
      {currentView === 'home' && (
         <div className="fixed bottom-6 left-4 right-4 z-50">
             <div className="bg-[#1E1E1E]/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-2xl flex justify-around items-center">
                 <NavButton icon={<Home size={22} />} label="Home" active />
                 <NavButton icon={<Video size={22} />} label="Projects" />
                 <NavButton icon={<Menu size={22} />} label="Menu" />
             </div>
         </div>
      )}

      <Toaster position="top-center" theme="dark" richColors closeButton />
    </div>
  );
}

function NavButton({ icon, label, active }: any) {
    return (
        <button className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${active ? 'text-cyan-400' : 'text-gray-500 hover:text-gray-300'}`}>
            {icon}
            <span className="text-[10px] font-medium">{label}</span>
            {active && <div className="h-1 w-1 rounded-full bg-cyan-400 mt-1 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />}
        </button>
    )
}

function Dashboard({ onViewChange, user }: { onViewChange: (view: any) => void, user: any }) {
    const tools = [
        {
            id: 'enhance',
            title: 'Magic Fix',
            desc: 'AI Photo Enhance',
            icon: <Wand2 className="h-8 w-8 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />,
            color: 'group-hover:border-cyan-500/50',
            bg: 'from-cyan-500/10 to-blue-500/5'
        },
        {
            id: 'slideshow',
            title: 'Video 9:16',
            desc: 'Reels Generator',
            icon: <Video className="h-8 w-8 text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.5)]" />,
            color: 'group-hover:border-purple-500/50',
            bg: 'from-purple-500/10 to-pink-500/5'
        },
        {
            id: 'ai-convert',
            title: 'AI Text',
            desc: 'Description Gen',
            icon: <FileText className="h-8 w-8 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />,
            color: 'group-hover:border-emerald-500/50',
            bg: 'from-emerald-500/10 to-green-500/5'
        },
        {
            id: 'gallery',
            title: 'Gallery',
            desc: 'Your History',
            icon: <div className="h-8 w-8 rounded-full border-2 border-gray-600 flex items-center justify-center text-gray-400"><span className="text-xs">History</span></div>,
            color: 'group-hover:border-gray-500/50',
            bg: 'from-gray-800/20 to-gray-900/20'
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Hero Text */}
            <div className="space-y-1">
                <h1 className="text-3xl font-bold bg-gradient-to-br from-white via-gray-100 to-gray-500 bg-clip-text text-transparent">
                    Dashboard
                </h1>
                <p className="text-gray-500 text-sm font-light">Select a tool to start creating</p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 gap-4">
                {tools.map((tool) => (
                    <button
                        key={tool.id}
                        onClick={() => onViewChange(tool.id)}
                        className={`group relative p-5 h-44 flex flex-col justify-between items-start rounded-3xl border border-white/5 bg-[#1E1E1E] transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-2xl ${tool.color} text-left overflow-hidden`}
                    >
                         {/* Subtle Gradient BG */}
                         <div className={`absolute inset-0 bg-gradient-to-br ${tool.bg} opacity-20 group-hover:opacity-40 transition-opacity`} />
                         
                         {/* Icon Box */}
                         <div className="relative p-3 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/5 group-hover:bg-white/10 transition-colors">
                             {tool.icon}
                         </div>

                         {/* Text */}
                         <div className="relative z-10 w-full">
                             <h3 className="font-bold text-lg text-gray-100 mb-0.5">{tool.title}</h3>
                             <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">{tool.desc}</p>
                         </div>
                    </button>
                ))}
            </div>
            
            {/* Premium Upgrade Card */}
            {!user.isPremium && (
                <div className="relative overflow-hidden rounded-3xl p-6 border border-amber-500/30">
                    {/* Animated Golden Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#2a1b0a] via-[#452c0f] to-[#1a1005]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.15),transparent_50%)]" />
                    
                    <div className="relative z-10 flex flex-col gap-4"> 
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">👑</span>
                                <h3 className="text-xl font-bold text-amber-100">Upgrade to PRO</h3>
                            </div>
                            <p className="text-amber-200/60 text-sm leading-relaxed max-w-[80%]">
                                Unlock unlimited access, 4K export, and remove all watermarks.
                            </p>
                        </div>

                        <button className="w-full py-3.5 bg-[#FFD700] hover:bg-[#FFC000] active:scale-[0.98] text-black font-extrabold text-sm tracking-wide rounded-xl shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all flex items-center justify-center gap-2">
                            <span>Get Premium for 49,000 sum</span>
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}



export default App;
