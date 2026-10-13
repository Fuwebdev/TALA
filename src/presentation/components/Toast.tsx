import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  success: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string, duration = 4000) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, title?: string) => showToast(message, 'success', title),
    [showToast]
  );
  const warning = useCallback(
    (message: string, title?: string) => showToast(message, 'warning', title, 5500),
    [showToast]
  );
  const error = useCallback(
    (message: string, title?: string) => showToast(message, 'error', title, 6000),
    [showToast]
  );
  const info = useCallback(
    (message: string, title?: string) => showToast(message, 'info', title),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, warning, error, info }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0">
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isWarning = toast.type === 'warning';
          const isError = toast.type === 'error';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl backdrop-blur-md flex items-start gap-3 transition-all duration-300 animate-slideUp ${
                isSuccess
                  ? 'bg-slate-900/95 border-teal-500/30 text-teal-300 shadow-teal-500/10'
                  : isWarning
                  ? 'bg-slate-900/95 border-amber-500/40 text-amber-300 shadow-amber-500/10'
                  : isError
                  ? 'bg-slate-900/95 border-rose-500/40 text-rose-300 shadow-rose-500/10'
                  : 'bg-slate-900/95 border-sky-500/30 text-sky-300 shadow-sky-500/10'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-teal-400" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                {isError && <AlertCircle className="w-5 h-5 text-rose-400" />}
                {!isSuccess && !isWarning && !isError && <Info className="w-5 h-5 text-sky-400" />}
              </div>

              <div className="flex-1 min-w-0 space-y-0.5">
                {toast.title && (
                  <h4 className="text-xs font-bold text-white tracking-wide">
                    {toast.title}
                  </h4>
                )}
                <p className="text-xs leading-relaxed text-slate-200 break-words font-normal">
                  {toast.message}
                </p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
