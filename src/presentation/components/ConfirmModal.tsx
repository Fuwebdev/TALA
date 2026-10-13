import React from 'react';
import { AlertTriangle, X, Check } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header Icon */}
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              isDestructive
                ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                : 'bg-sky-500/15 border border-sky-500/30 text-sky-400'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">{title}</h3>
          </div>
        </div>

        {/* Message */}
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed break-words">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-md transition-all ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                : 'bg-sky-500 hover:bg-sky-400 shadow-sky-500/20'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
