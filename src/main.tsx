import { StrictMode, Component, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/queryClient'
import './index.css'
import App from './App.tsx'
import './i18n'; // Initialize i18n

// ===========================================
// Telegram WebApp Mock (for Local Testing)
// ===========================================
// @ts-ignore
if (import.meta.env.DEV && !window.Telegram?.WebApp?.initData) {
  console.log('🛠️ Mocking Telegram WebApp for local testing...');
  
  const mockUser = {
    id: 12345678,
    first_name: 'Test',
    last_name: 'Makler',
    username: 'test_makler',
    language_code: 'uz',
    is_premium: true
  };

  // @ts-ignore
  window.Telegram = {
    WebApp: {
      initData: `user=${encodeURIComponent(JSON.stringify(mockUser))}&hash=mock_hash`,
      initDataUnsafe: {
        user: mockUser,
        auth_date: Date.now(),
        hash: 'mock_hash'
      },
      version: '6.0',
      platform: 'unknown',
      colorScheme: 'dark',
      themeParams: {},
      isExpanded: true,
      viewportHeight: window.innerHeight,
      viewportStableHeight: window.innerHeight,
      headerColor: '#000000',
      backgroundColor: '#000000',
      isClosingConfirmationEnabled: false,
      BackButton: {
        isVisible: false,
        show: () => { 
           // @ts-ignore
           window.Telegram.WebApp.BackButton.isVisible = true; console.log('Show BackBtn'); 
        },
        hide: () => { 
           // @ts-ignore
           window.Telegram.WebApp.BackButton.isVisible = false; console.log('Hide BackBtn'); 
        },
        onClick: (cb: any) => { (window as any)._backBtnCb = cb }
      },
      MainButton: {
        text: 'CONTINUE',
        color: '#2481cc',
        textColor: '#ffffff',
        isVisible: false,
        isActive: true,
        isProgressVisible: false,
        show: () => { 
           // @ts-ignore
           window.Telegram.WebApp.MainButton.isVisible = true; console.log('Show MainBtn'); 
        },
        hide: () => { 
           // @ts-ignore
           window.Telegram.WebApp.MainButton.isVisible = false; console.log('Hide MainBtn'); 
        },
        enable: () => { 
           // @ts-ignore
           window.Telegram.WebApp.MainButton.isActive = true 
        },
        disable: () => { 
           // @ts-ignore
           window.Telegram.WebApp.MainButton.isActive = false 
        },
        showProgress: () => { 
           // @ts-ignore
           window.Telegram.WebApp.MainButton.isProgressVisible = true 
        },
        hideProgress: () => { 
           // @ts-ignore
           window.Telegram.WebApp.MainButton.isProgressVisible = false 
        },
        onClick: (cb: any) => { (window as any)._mainBtnCb = cb },
        setText: (text: string) => { 
           // @ts-ignore
           window.Telegram.WebApp.MainButton.text = text 
        },
        setParams: (params: any) => { 
           // @ts-ignore
           Object.assign(window.Telegram.WebApp.MainButton, params) 
        }
      },
      HapticFeedback: {
        impactOccurred: (style: string) => console.log(`📳 Haptic Impact: ${style}`),
        notificationOccurred: (type: string) => console.log(`📳 Haptic Notification: ${type}`),
        selectionChanged: () => console.log(`📳 Haptic Selection Changed`)
      },
      ready: () => {},
      expand: () => {},
      close: () => {},
      openTelegramLink: (url: string) => window.open(url, '_blank'),
      openLink: (url: string) => window.open(url, '_blank'),
      openInvoice: (url: string) => console.log(`💰 Open Invoice: ${url}`),
      showAlert: (msg: string) => alert(msg),
      showConfirm: (msg: string, cb: any) => cb(confirm(msg)),
      showScanQrPopup: (params: any, cb: any) => console.log('QR Scanner'),
      closeScanQrPopup: () => {},
      readTextFromClipboard: (cb: any) => cb('Mock Clipboard Text')
    }
  };
}

// Create query client instance
const queryClient = createQueryClient()

// Xatolarni ushlash uchun oddiy komponent
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'white', background: '#1a1a1a', height: '100vh', fontFamily: 'sans-serif' }}>
          <h2>⚠️ Ilova ishga tushmadi</h2>
          <p style={{ color: '#ff6b6b', background: '#2d0a0a', padding: 10, borderRadius: 8 }}>
            {this.state.error?.toString()}
          </p>
          <div style={{ marginTop: 20, fontSize: 12, opacity: 0.7 }}>
             <p>Debug Info:</p>
             <ul style={{ listStyle: 'none', padding: 0 }}>
                <li>Supabase URL: {import.meta.env.VITE_SUPABASE_URL ? '✅ Mavjud' : '❌ Yo\'q (Vercel ENV ni tekshiring)'}</li>
                <li>Supabase Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Mavjud' : '❌ Yo\'q (Vercel ENV ni tekshiring)'}</li>
             </ul>
          </div>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: 20, padding: '10px 20px', background: '#0088cc', border: 'none', color: 'white', borderRadius: 8 }}
          >
            Qayta yuklash
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
          <App />
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
)

