import React, { useState, useEffect } from 'react';
import { X, Edit3, Trash2, AlertTriangle, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { Thought, Category } from '../../domain/entities/Thought';
import { ModerationService } from '../../application/services/ModerationService';
import { DeviceBanService } from '../../application/services/DeviceBanService';
import { useToast } from './Toast';

interface EditThoughtModalProps {
  isOpen: boolean;
  onClose: () => void;
  thought: Thought | null;
  onUpdate: (
    thoughtId: string,
    params: { body: string; category: Category; isEnvironmentalAlert: boolean }
  ) => Promise<void>;
  onDelete: (thoughtId: string) => Promise<void>;
}

export const EditThoughtModal: React.FC<EditThoughtModalProps> = ({
  isOpen,
  onClose,
  thought,
  onUpdate,
  onDelete,
}) => {
  const { showToast } = useToast();
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<Category>('Thoughts');
  const [isEnvironmentalAlert, setIsEnvironmentalAlert] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [moderationError, setModerationError] = useState<string | null>(null);

  useEffect(() => {
    if (thought) {
      setBody(thought.body);
      setCategory(thought.category);
      setIsEnvironmentalAlert(Boolean(thought.isEnvironmentalAlert));
      setModerationError(null);
      setConfirmDelete(false);
    }
  }, [thought, isOpen]);

  if (!isOpen || !thought) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) {
      setModerationError('Note cannot be empty.');
      return;
    }

    try {
      setSubmitting(true);
      setModerationError(null);

      // AI + Local Bad Word Moderation Pipeline
      const modResult = await ModerationService.evaluateText(body);
      if (!modResult.allowed) {
        setModerationError(
          modResult.message ||
            'Your message contains inappropriate language. Please remove offensive words and try again.'
        );
        try {
          const violation = await DeviceBanService.recordViolation(
            modResult.reason || 'Profanity or abusive content in note edit',
            body.trim(),
            thought.authorAlias.id,
            thought.authorAlias.displayName
          );
          showToast(violation.warningMessage, violation.isBanned ? 'error' : 'warning');
          if (violation.isBanned) {
            setTimeout(() => {
              window.location.reload();
            }, 1200);
          }
        } catch {}
        setSubmitting(false);
        return;
      }

      await onUpdate(thought.id, {
        body: body.trim(),
        category,
        isEnvironmentalAlert,
      });

      onClose();
    } catch (err: any) {
      setModerationError(err.message || 'Failed to update note.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    try {
      setDeleting(true);
      await onDelete(thought.id);
      onClose();
    } catch (err: any) {
      setModerationError(err.message || 'Failed to delete note.');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const categories: Category[] = ['Thoughts', 'School', 'Life', 'Community', 'Environment'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-teal-400 flex items-center justify-center text-white shrink-0">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Edit Your Note</h2>
              <p className="text-[11px] text-slate-400">
                Update your note in {thought.location.cityMunicipality}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto pr-1">
          {/* Moderation Error / Warning Alert */}
          {moderationError && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">Content Moderation Warning</span>
                <span className="text-[11px] leading-relaxed block">{moderationError}</span>
              </div>
            </div>
          )}

          {/* Category Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    category === cat
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                      : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Note Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Note Content
              </label>
              <span
                className={`text-[11px] ${
                  body.length > 450 ? 'text-amber-400 font-bold' : 'text-slate-400'
                }`}
              >
                {body.length}/500
              </span>
            </div>
            <textarea
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setModerationError(null);
              }}
              rows={4}
              maxLength={500}
              placeholder="What's happening nearby? Share thoughts, alerts, or school updates..."
              className={`w-full p-3.5 bg-slate-950/80 border rounded-2xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors resize-none leading-relaxed ${
                moderationError
                  ? 'border-rose-500 focus:border-rose-400'
                  : 'border-slate-800 focus:border-sky-500/50'
              }`}
            />
          </div>

          {/* Environmental Alert Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-200">Environmental / Flood Alert</p>
                <p className="text-[10px] text-slate-400">
                  Highlight this note in orange for weather or coastal debris reports
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isEnvironmentalAlert}
              onChange={(e) => setIsEnvironmentalAlert(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-900 border-slate-700"
            />
          </div>

          {/* Action Footer: Delete + Save Buttons */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
            {/* Delete button with confirmation state */}
            <div>
              {confirmDelete ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-rose-400 font-semibold">Confirm delete?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-2 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Note</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !body.trim()}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-white text-xs font-semibold shadow-md shadow-sky-500/20 disabled:opacity-40 transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Checking & Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
