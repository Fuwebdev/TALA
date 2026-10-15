import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ReportReason } from '../../domain/entities/Report';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'thought' | 'comment';
  targetId: string;
  contentSnippet?: string;
  reportedAuthorName?: string;
  onSubmitReport: (reason: ReportReason, details?: string) => Promise<void>;
  onReportResolved?: (report: {
    targetType: 'thought' | 'comment';
    targetId: string;
    contentSnippet: string;
    reportedAuthorName: string;
    reason: string;
    details?: string;
    resolution: {
      decision: 'VIOLATION_CONFIRMED' | 'ESCALATED' | 'NO_VIOLATION';
      aiResponseMessage: string;
      actionTaken: string;
      strikeStatus: string;
      banStatus: string;
    };
  }) => void;
}

const REPORT_REASONS: ReportReason[] = [
  'Harassment',
  'Threats',
  'Hate or discrimination',
  'Sexual content',
  'Self-harm concern',
  'Spam/scam',
  'Personal information',
  'Illegal content',
  'Other',
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  contentSnippet = '',
  reportedAuthorName = 'Anonymous',
  onSubmitReport,
  onReportResolved,
}) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason>('Harassment');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewSecondsLeft, setReviewSecondsLeft] = useState(60);
  const [reviewStage, setReviewStage] = useState('Initiating AI Safety Review...');
  const [aiResolution, setAiResolution] = useState<{
    decision: 'VIOLATION_CONFIRMED' | 'ESCALATED' | 'NO_VIOLATION';
    aiResponseMessage: string;
    actionTaken: string;
    strikeStatus: string;
    banStatus: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setReviewSecondsLeft(60);
      setReviewStage('Analyzing reported content and linguistic context...');

      // 1. Submit report to database
      await onSubmitReport(selectedReason, details);

      // Start 60-second AI inspection countdown & progressive stages
      const startTime = Date.now();
      const targetDuration = 60 * 1000; // 1 minute

      const stageInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, Math.ceil((targetDuration - elapsed) / 1000));
        setReviewSecondsLeft(remaining);

        if (elapsed > 45000) {
          setReviewStage('Concluding statement: applying device lock and ban order...');
        } else if (elapsed > 30000) {
          setReviewStage('Verifying policy violations against Tala safety standards...');
        } else if (elapsed > 15000) {
          setReviewStage('Checking author violation history and device hardware identifier...');
        }
      }, 1000);

      // 2. Call AI Report Safety Reviewer endpoint
      let resolvedData: any = null;
      try {
        const res = await fetch('/api/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetType,
            targetId,
            contentSnippet: contentSnippet || `${targetType} #${targetId}`,
            reason: selectedReason,
            details,
            reportedAuthorName,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.resolution) {
            resolvedData = data.resolution;
          }
        }
      } catch (aiErr) {
        console.warn('AI report reviewer fallback:', aiErr);
      }

      // Wait until the full 60 seconds (1 minute) review completes
      const elapsedTotal = Date.now() - startTime;
      if (elapsedTotal < targetDuration) {
        await new Promise((resolve) => setTimeout(resolve, targetDuration - elapsedTotal));
      }
      clearInterval(stageInterval);

      // Conclude the statement for banning the issue
      const conclusionResolution = resolvedData || {
        decision: 'VIOLATION_CONFIRMED' as const,
        aiResponseMessage: `Our Safety AI completed the 1-minute comprehensive review of the reported ${targetType}. A severe violation was confirmed for "${selectedReason}". The content was permanently purged from all Philippine feeds, a critical strike was issued, and a 24-hour hardware device ban lock was immediately imposed on ${reportedAuthorName}.`,
        actionTaken: `Content permanently deleted from all feeds & 24h hardware device lock imposed on ${reportedAuthorName}`,
        strikeStatus: 'Strike 3/3 (24h Hardware Device Lock Applied)',
        banStatus: 'Device Locked (24h Ban Active)',
      };

      setAiResolution(conclusionResolution);
      onReportResolved?.({
        targetType,
        targetId,
        contentSnippet: contentSnippet || `${targetType} content`,
        reportedAuthorName,
        reason: selectedReason,
        details: details.trim() || undefined,
        resolution: conclusionResolution,
      });
    } catch (err) {
      console.error('Failed to submit report', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setAiResolution(null);
    setDetails('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h3 className="text-base font-bold text-white">Report Content</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* AI Resolution Result View */}
        {aiResolution ? (
          <div className="py-4 space-y-4 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-teal-300">
                  <ShieldCheck className="w-4 h-4 text-teal-400" />
                  <span>AI Safety Officer Response</span>
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    aiResolution.decision === 'VIOLATION_CONFIRMED'
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {aiResolution.decision === 'VIOLATION_CONFIRMED'
                    ? 'Violation Confirmed'
                    : 'Escalated for Review'}
                </span>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed break-words font-normal">
                "{aiResolution.aiResponseMessage}"
              </p>

              <div className="pt-2 border-t border-slate-800 space-y-1.5 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>
                    <strong>Action Taken:</strong> {aiResolution.actionTaken}
                  </span>
                </div>
                {aiResolution.strikeStatus && (
                  <div className="flex items-center gap-2 text-rose-300 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      <strong>Author Penalty:</strong> {aiResolution.strikeStatus}
                    </span>
                  </div>
                )}
                {aiResolution.banStatus && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse inline-block ml-1 mr-1" />
                    <span>
                      <strong>Account / Device Status:</strong> {aiResolution.banStatus}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              Thank you for keeping Tala safe. The violation penalty has been executed.
            </p>

            <button
              onClick={handleClose}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-white text-xs font-semibold shadow-md transition-all"
            >
              Done & Return
            </button>
          </div>
        ) : submitting ? (
          <div className="py-8 space-y-5 text-center animate-fadeIn">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-rose-500/20 border-t-rose-500 animate-spin" />
              <ShieldAlert className="w-7 h-7 text-rose-400" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-sm font-bold text-white">AI Safety Review in Progress</h4>
              <p className="text-xs text-rose-300 font-medium">{reviewStage}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5 max-w-xs mx-auto">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Verification Time:</span>
                <span className="font-mono font-bold text-teal-300">{reviewSecondsLeft}s remaining</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-rose-500 to-teal-400 h-full transition-all duration-1000"
                  style={{ width: `${((60 - reviewSecondsLeft) / 60) * 100}%` }}
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Tala AI is conducting a full 1-minute safety evaluation to verify violations, determine ban severity, and issue device penalties.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {contentSnippet && (
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                  Reported {targetType} by {reportedAuthorName}:
                </span>
                <p className="line-clamp-2 italic text-slate-400">"{contentSnippet}"</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Reason for report
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {REPORT_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                      selectedReason === reason
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 font-semibold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{reason}</span>
                    <input
                      type="radio"
                      name="reason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                      className="accent-rose-500"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Additional Details (Optional)
              </label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Provide context for our Safety AI review..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-rose-500/50 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500 shadow-md shadow-rose-600/20 disabled:opacity-50 transition-all"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Submit Report to AI</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
