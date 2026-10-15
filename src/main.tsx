import React from 'react';
import ReactDOM from 'react-dom/client';
import { HomePage } from './presentation/pages/HomePage';
import { ToastProvider } from './presentation/components/Toast';
import { ThemeService } from './application/services/ThemeService';
import './presentation/styles/index.css';

ThemeService.initTheme();

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[Tala ErrorBoundary] Caught runtime error, resetting stale cache:', error);
    try {
      localStorage.removeItem('tala_cached_user_location_v1');
      localStorage.removeItem('tala_cached_nearby_5km_v1');
      localStorage.removeItem('tala_cached_user_gps_v1');
    } catch {
      // Ignore
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{ backgroundColor: '#030712', color: '#f8fafc', minHeight: '100vh' }}
          className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-950 text-slate-100"
        >
          <img
            src="/icon-192.png"
            alt="Tala"
            className="w-16 h-16 rounded-2xl mb-4 shadow-lg"
          />
          <h2 className="text-lg font-bold mb-2">Refreshing Tala...</h2>
          <p className="text-xs text-slate-400 mb-4">
            A new update was deployed. Click below to load the latest version.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-xl bg-sky-500 text-white text-xs font-bold"
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <ToastProvider>
        <HomePage />
      </ToastProvider>
    </AppErrorBoundary>
  </React.StrictMode>
);
