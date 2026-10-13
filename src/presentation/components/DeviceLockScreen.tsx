import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Lock,
  Clock,
  AlertTriangle,
  RefreshCw,
  Bot,
  Send,
  CheckCircle2,
  XCircle,
  X,
  Sparkles,
} from 'lucide-react';
import { DeviceBanService, DeviceBanStatus } from '../../application/services/DeviceBanService';

interface DeviceLockScreenProps {
  banStatus: DeviceBanStatus;
  onRefreshCheck?: () => Promise<void>;
  aliasName?: string;
}

export const DeviceLockScreen: React.FC<DeviceLockScreenProps> = ({
  banStatus,
  onRefreshCheck,
  aliasName,
}) => {
  const [remainingSec, setRemainingSec] = useState(() => {
    if (banStatus.isPermanent) return Infinity;
    if (!banStatus.lockedUntilISO) return 0;
    const diff = new Date(banStatus.lockedUntilISO).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  });
  const [checking, setChecking] = useState(false);

  // Appeal Modal State
  const [isAppealOpen, setIsAppealOpen] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);
  const [appealResult, setAppealResult] = useState<{
    decision: 'APPROVED' | 'DENIED';
    aiExplanation: string;
    unlocked: boolean;
  } | null>(null);
  const [appealError, setAppealError] = useState<string | null>(null);

  useEffect(() => {
    if (banStatus.isPermanent || remainingSec <= 0) return;

    const timer = setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onRefreshCheck?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [banStatus, remainingSec, onRefreshCheck]);

  const formatCountdown = (totalSec: number) => {
    if (totalSec === Infinity) return 'Permanent Restriction';
    if (totalSec <= 0) return 'Suspension Expired — Click Check Status';

    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return parts.join(' ');
  };

  const getBanDurationTitle = () => {
    if (banStatus.isPermanent) return 'Permanent Device Ban';
    switch (banStatus.banLevel) {
      case 1:
        return '24-Hour Temporary Device Suspension';
      case 2:
        return '3-Day Temporary Device Suspension';
      case 3:
        return '7-Day Temporary Device Suspension';
      default:
        return 'Device Suspended';
    }
  };

  const handleManualCheck = async () => {
    if (!onRefreshCheck) return;
    setChecking(true);
    try {
      await onRefreshCheck();
    } finally {
      setChecking(false);
    }
  };

  const handleAppealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealReason.trim() || appealReason.trim().length < 10) {
      setAppealError('Please write at least 10 characters explaining your appeal.');
      return;
    }

    try {
      setSubmittingAppeal(true);
      setAppealError(null);

      const result = await DeviceBanService.submitAppeal(appealReason.trim(), aliasName);
      setAppealResult(result);

      if (result.unlocked) {
        // If granted, auto refresh check
        setTimeout(() => {
          onRefreshCheck?.();
        }, 1500);
      }
    } catch (err: any) {
      setAppealError(err.message || 'Failed to submit appeal to AI. Please try again.');
    } finally {
      setSubmittingAppeal(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
        {/* Glow Header */}
        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-xl shadow-rose-500/20 animate-pulse">
          <ShieldAlert className="w-10 h-10" />
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold shadow">
            <Lock className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Title & Badge */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Community Guidelines Violation</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            {getBanDurationTitle()}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
            This device has been restricted from creating notes, editing, commenting, or interacting with Tala due to repeated abusive language or profanity filter bypass attempts.
          </p>
        </div>

        {/* Lock Duration / Countdown Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-left">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-semibold text-slate-300">
              <Clock className="w-4 h-4 text-sky-400" />
              <span>Time Remaining:</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[11px]">
              Strike {banStatus.strikeCount}
            </span>
          </div>

          <div className="text-2xl sm:text-3xl font-mono font-bold text-teal-300 text-center py-2 tracking-wider">
            {formatCountdown(remainingSec)}
          </div>

          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            {banStatus.isPermanent
              ? 'This device is permanently prohibited from accessing Tala services.'
              : 'The lock will automatically unlock when the timer expires. Reinstalling or clearing cache will not bypass this hardware device restriction.'}
          </p>
        </div>

        {/* Policies Note */}
        <div className="text-left text-[11px] text-slate-400 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
          <p className="font-semibold text-slate-300">Violation Penalty Escalation:</p>
          <ul className="list-disc list-inside space-y-0.5 text-slate-400 text-[10px]">
            <li>1st & 2nd offense: Warnings issued</li>
            <li>3rd offense: 24-hour device lock</li>
            <li>4th offense: 3-day device lock</li>
            <li>5th offense: 7-day device lock</li>
            <li>6th+ offense: Permanent hardware ban</li>
          </ul>
        </div>

        {/* Actions: Refresh & Appeal to AI */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => {
              setIsAppealOpen(true);
              setAppealResult(null);
              setAppealError(null);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-sky-500/20 transition-all hover:scale-105"
          >
            <Bot className="w-4 h-4" />
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>Appeal Suspension to AI</span>
          </button>

          {onRefreshCheck && !banStatus.isPermanent && (
            <button
              onClick={handleManualCheck}
              disabled={checking}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin text-sky-400' : ''}`} />
              <span>{checking ? 'Checking...' : 'Check Status'}</span>
            </button>
          )}
        </div>
      </div>

      {/* AI Appeal Modal */}
      {isAppealOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">AI Appeal Review</h3>
                  <p className="text-[10px] text-slate-400">Powered by OpenRouter AI</p>
                </div>
              </div>
              <button
                onClick={() => setIsAppealOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {appealResult ? (
              <div className="space-y-4 py-2">
                <div
                  className={`p-4 rounded-2xl border text-left space-y-2 ${
                    appealResult.decision === 'APPROVED'
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-rose-500/10 border-rose-500/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {appealResult.decision === 'APPROVED' ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-300">
                          Appeal Granted — Suspension Lifted
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-rose-400" />
                        <span className="text-xs font-bold text-rose-300">
                          Appeal Denied — Suspension Maintained
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {appealResult.aiExplanation}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsAppealOpen(false);
                    if (appealResult.unlocked) {
                      onRefreshCheck?.();
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
                >
                  {appealResult.unlocked ? 'Return to Tala' : 'Close'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleAppealSubmit} className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed text-left">
                  Explain why your suspension should be reconsidered (e.g. false flag, misunderstood slang/context, or sincere apology). Our AI safety evaluator will review it instantly.
                </p>

                {appealError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-left">
                    {appealError}
                  </div>
                )}

                <textarea
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  placeholder="Explain your situation or apology here (minimum 10 characters)..."
                  rows={4}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-sky-500 placeholder-slate-500 resize-none"
                  disabled={submittingAppeal}
                />

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAppealOpen(false)}
                    disabled={submittingAppeal}
                    className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAppeal || !appealReason.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {submittingAppeal ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>AI Reviewing...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Appeal</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
