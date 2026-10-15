import React, { useState } from 'react';
import { X, Send, MessageSquare, ShieldCheck, Flag, UserX, AlertTriangle } from 'lucide-react';
import { Thought } from '../../domain/entities/Thought';
import { Comment } from '../../domain/entities/Comment';
import { Alias } from '../../domain/entities/Alias';
import { ModerationService } from '../../application/services/ModerationService';
import { DeviceBanService } from '../../application/services/DeviceBanService';
import { ConfirmModal } from './ConfirmModal';
import { useToast } from './Toast';
import { TalaAvatar } from './TalaAvatar';

interface CommentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  thought: Thought | null;
  currentAlias: Alias;
  comments: Comment[];
  loading: boolean;
  onAddComment: (thoughtId: string, body: string) => Promise<void>;
  onReportComment: (comment: Comment) => void;
  onBlockUser?: (aliasId: string, aliasName: string) => void;
}

export const CommentsDrawer: React.FC<CommentsDrawerProps> = ({
  isOpen,
  onClose,
  thought,
  currentAlias,
  comments,
  loading,
  onAddComment,
  onReportComment,
  onBlockUser,
}) => {
  const { showToast } = useToast();
  const [commentBody, setCommentBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [blockTarget, setBlockTarget] = useState<{ id: string; name: string } | null>(null);

  if (!isOpen || !thought) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim()) return;

    try {
      setSubmitting(true);
      setModerationError(null);

      // AI + Local Bad Word Moderation Pipeline
      const modResult = await ModerationService.evaluateText(commentBody);
      if (!modResult.allowed) {
        setModerationError(
          modResult.message ||
            'Your comment contains inappropriate language. Please remove offensive words and try again.'
        );
        // Record violation strike against device
        try {
          const violation = await DeviceBanService.recordViolation(
            modResult.reason || 'Profanity or abusive language in comment',
            commentBody.trim(),
            currentAlias.id,
            currentAlias.displayName
          );
          showToast(violation.warningMessage, violation.isBanned ? 'error' : 'warning');
        } catch {}
        setSubmitting(false);
        return;
      }

      await onAddComment(thought.id, commentBody.trim());
      setCommentBody('');
    } catch (err: any) {
      setModerationError(err.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const timeAgo = (isoString: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-sky-400" />
            <h3 className="font-bold text-sm text-slate-100">Anonymous Replies</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
              {comments.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Original Note Context */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800/80 flex items-start gap-3">
          <TalaAvatar
            seed={thought.authorAlias.avatarSeed || thought.authorAlias.displayName}
            size="md"
            className="shrink-0 mt-0.5"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5 flex-wrap">
              <span className="font-semibold text-sky-300 truncate">{thought.authorAlias.displayName}</span>
              <span>•</span>
              <span className="text-[11px] truncate">{thought.location.cityMunicipality || thought.location.province}</span>
            </div>
            <p className="text-xs text-slate-200 line-clamp-3 leading-relaxed">{thought.body}</p>
          </div>
        </div>

        {/* Comments Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-xs text-slate-500">
              Loading replies...
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500 space-y-2">
              <ShieldCheck className="w-8 h-8 text-slate-600" />
              <p className="text-xs">No replies yet. Be the first to share your thoughts politely!</p>
            </div>
          ) : (
            comments.map(c => (
              <div key={c.id} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs space-y-1.5 group">
                <div className="flex items-center justify-between text-slate-400">
                  <div className="flex items-center gap-2 min-w-0">
                    <TalaAvatar
                      seed={c.authorAlias.avatarSeed || c.authorAlias.displayName}
                      size="xs"
                      className="shrink-0"
                    />
                    <span className="font-bold text-slate-200 truncate">{c.authorAlias.displayName}</span>
                    <span className="text-[10px] text-slate-500 shrink-0">• {timeAgo(c.createdAtISO)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onBlockUser && c.authorAlias.displayName.toLowerCase() !== currentAlias.displayName.toLowerCase() && (
                      <button
                        onClick={() => setBlockTarget({ id: c.authorAlias.id, name: c.authorAlias.displayName })}
                        className="text-slate-500 hover:text-amber-400 transition-colors p-1"
                        title={`Block ${c.authorAlias.displayName}`}
                      >
                        <UserX className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => onReportComment(c)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                      title="Report comment"
                    >
                      <Flag className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <p className="text-slate-300 leading-relaxed">{c.body}</p>
              </div>
            ))
          )}
        </div>

        {/* Post Comment Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-slate-800 bg-slate-950 space-y-2">
          {moderationError && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs animate-shake">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-[11px]">Content Flagged</p>
                <p className="text-[11px] leading-tight text-rose-300/90">{moderationError}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Replying as <strong className="text-slate-300">{currentAlias.displayName}</strong></span>
            <span>{commentBody.length}/300</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={commentBody}
              onChange={(e) => {
                setCommentBody(e.target.value);
                setModerationError(null);
              }}
              placeholder="Write an anonymous reply..."
              maxLength={300}
              className={`flex-1 px-3.5 py-2.5 bg-slate-900 border rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors ${
                moderationError
                  ? 'border-rose-500 focus:border-rose-400'
                  : 'border-slate-800 focus:border-sky-500/50'
              }`}
            />
            <button
              type="submit"
              disabled={submitting || !commentBody.trim()}
              className="p-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/20 disabled:opacity-40 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* In-App Block User Confirmation Modal (Zero Script Alert) */}
        <ConfirmModal
          isOpen={!!blockTarget}
          onClose={() => setBlockTarget(null)}
          title={`Block ${blockTarget?.name}?`}
          message="You will no longer see notes or comments from this author."
          confirmLabel="Block Author"
          isDestructive={true}
          onConfirm={() => {
            if (blockTarget && onBlockUser) {
              onBlockUser(blockTarget.id, blockTarget.name);
              showToast(`Blocked ${blockTarget.name}`, 'info');
            }
            setBlockTarget(null);
          }}
        />
      </div>
    </div>
  );
};
