import React, { useEffect, useState } from 'react';
import { Download, ExternalLink, CheckCircle2, Sparkles, ShieldCheck, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    __deferredPwaPrompt?: BeforeInstallPromptEvent | null;
  }
}

interface PwaInstallGateModalProps {
  onInstalledOrContinue: () => void;
  onClose?: () => void;
}

export const PwaInstallGateModal: React.FC<PwaInstallGateModalProps> = ({
  onInstalledOrContinue,
  onClose,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => window.__deferredPwaPrompt || null
  );
  const [isInstalling, setIsInstalling] = useState(false);
  const [installComplete, setInstallComplete] = useState(false);

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isChrome = /Chrome|CriOS/i.test(ua) && !/Edg|OPR|SamsungBrowser|FBAN|FBAV|Messenger|Instagram|TikTok|Line/i.test(ua);

  useEffect(() => {
    const syncPrompt = () => {
      if (window.__deferredPwaPrompt) {
        setDeferredPrompt(window.__deferredPwaPrompt);
      }
    };

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__deferredPwaPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handleInstalled = () => {
      setInstallComplete(true);
      try {
        localStorage.setItem('tala_pwa_installed_v1', 'true');
      } catch {
        // Ignore storage error
      }
      setTimeout(() => {
        onInstalledOrContinue();
      }, 900);
    };

    syncPrompt();
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('tala-pwa-ready', syncPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    window.addEventListener('tala-pwa-installed', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('tala-pwa-ready', syncPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener('tala-pwa-installed', handleInstalled);
    };
  }, [onInstalledOrContinue]);

  const handleOpenInChrome = () => {
    const targetUrl = window.location.href || 'https://tala-z2kn.vercel.app/';
    const hostAndPath = window.location.host + window.location.pathname + window.location.search;
    const fallback = encodeURIComponent(targetUrl);

    if (isAndroid) {
      window.location.href = `intent://${hostAndPath}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
      return;
    }

    if (isIOS) {
      const chromeIosUrl = targetUrl.replace(/^https:\/\//i, 'googlechromes://').replace(/^http:\/\//i, 'googlechrome://');
      window.location.href = chromeIosUrl;
      return;
    }

    window.open(targetUrl, '_blank');
  };

  const handleDirectInstall = async () => {
    const activePrompt = deferredPrompt || window.__deferredPwaPrompt;

    // If user is not in Chrome yet and no direct prompt is ready, redirect straight to Chrome
    if (!activePrompt && !isChrome && (isAndroid || isIOS)) {
      handleOpenInChrome();
      return;
    }

    if (activePrompt) {
      setIsInstalling(true);
      try {
        await activePrompt.prompt();
        const choice = await activePrompt.userChoice;
        window.__deferredPwaPrompt = null;
        setDeferredPrompt(null);

        if (choice.outcome === 'accepted') {
          setInstallComplete(true);
          try {
            localStorage.setItem('tala_pwa_installed_v1', 'true');
          } catch {
            // Ignore
          }
          setTimeout(() => {
            onInstalledOrContinue();
          }, 800);
        }
      } catch (err) {
        console.warn('Direct PWA install prompt notice:', err);
      } finally {
        setIsInstalling(false);
      }
      return;
    }

    // If browser already installed the PWA or doesn't expose beforeinstallprompt on desktop, allow proceeding
    try {
      localStorage.setItem('tala_pwa_installed_v1', 'true');
    } catch {
      // Ignore
    }
    onInstalledOrContinue();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-sky-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl text-center space-y-5">
        
        {/* Optional Close Button */}
        {onClose && (
          <button
            type="button"
            aria-label="Close install prompt"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Official Tala App Icon */}
        <div className="relative mx-auto w-24 h-24">
          <img
            src="/icon-512.png"
            alt="Tala App Icon"
            className="w-24 h-24 rounded-3xl object-cover shadow-2xl shadow-sky-500/30 ring-2 ring-sky-400/40 mx-auto"
          />
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-teal-500 text-white shadow-lg ring-2 ring-slate-900">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-[11px] font-bold text-sky-400 uppercase tracking-wider">
            Official Tala App • Direct PWA Install
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Install Tala First
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Leave and discover anonymous notes right where you are across the Philippines. Install the app directly with one tap to get started.
          </p>
        </div>

        {/* Install Complete Feedback */}
        {installComplete ? (
          <div className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-bold">
            <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
            <span>Tala App Installed! Setting up your username & location...</span>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {/* Step 1: If opened outside Chrome on Mobile, offer Direct Open in Chrome */}
            {!isChrome && (isAndroid || isIOS) && !deferredPrompt && (
              <button
                type="button"
                onClick={handleOpenInChrome}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-white text-sm font-bold shadow-xl shadow-sky-500/25 transition-all active:scale-[0.98]"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open in Chrome for Direct Install</span>
              </button>
            )}

            {/* Direct 1-Tap PWA Install Button */}
            <button
              type="button"
              onClick={handleDirectInstall}
              disabled={isInstalling}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-white text-sm font-bold shadow-xl shadow-sky-500/25 transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              <span>
                {isInstalling
                  ? 'Installing Tala App...'
                  : deferredPrompt
                  ? 'Install Tala App Now'
                  : 'Install & Launch Tala App'}
              </span>
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span>Instant direct PWA installation • No manual home screen setup</span>
            </div>

            {/* Skip / Continue in Browser Link */}
            <div className="pt-1">
              <button
                type="button"
                onClick={onClose || onInstalledOrContinue}
                className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-4 transition-colors"
              >
                Continue in browser without installing
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
