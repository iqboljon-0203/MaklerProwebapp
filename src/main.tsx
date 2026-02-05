import { StrictMode, Component, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

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
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
  </StrictMode>,
)
