import React, { useState } from 'react';
import { X, Send, MessageSquare, ShieldCheck, Flag, UserX, AlertTriangle } from 'lucide-react';
import { Thought } from '../../domain/entities/Thought';
import { Comment } from '../../domain/entities/Comment';
import { Alias } from '../../domain/entities/Alias';
import { ModerationService } from '../../application/services/ModerationService';

interface CommentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  thought: Thought | null;
  currentAlias: Alias;
  comments: Comment[];
  loading: boolean;
  onAddComment: (thoughtId: string, body: string) => Promise<void>;
  onReportComment: (commentId: string) => void;
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
  const [commentBody, setCommentBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [moderationError, setModerationError] = useState<string | null>(null);

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
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm font-bold text-white">
              Comments ({comments.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thought Preview Banner */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800/80 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <span className="font-bold text-slate-200">{thought.authorAlias.displayName}</span>
            <span>in</span>
            <span className="text-sky-400 font-medium">{thought.location.cityMunicipality}</span>
          </div>
          <p className="text-slate-300 line-clamp-2 leading-relaxed">{thought.body}</p>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(n => (
                <div key={n} className="p-3 bg-slate-950/40 rounded-xl animate-pulse space-y-2">
                  <div className="h-3 w-1/4 bg-slate-800 rounded"></div>
                  <div className="h-4 w-3/4 bg-slate-800 rounded"></div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-slate-700" />
              <p>No comments yet. Join the conversation anonymously!</p>
            </div>
          ) : (
            comments.map(c => (
              <div key={c.id} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs space-y-1.5 group">
                <div className="flex items-center justify-between text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-200">{c.authorAlias.displayName}</span>
                    <span className="text-[10px] text-slate-500">• {timeAgo(c.createdAtISO)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onBlockUser && c.authorAlias.displayName.toLowerCase() !== currentAlias.displayName.toLowerCase() && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Block ${c.authorAlias.displayName}? You will no longer see notes or comments from this author.`)) {
                            onBlockUser(c.authorAlias.id, c.authorAlias.displayName);
                          }
                        }}
                        className="text-slate-500 hover:text-amber-400 transition-colors p-1"
                        title={`Block ${c.authorAlias.displayName}`}
                      >
                        <UserX className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => onReportComment(c.id)}
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
              <span className="leading-tight">{moderationError}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Commenting as <strong className="text-teal-400">{currentAlias.displayName}</strong></span>
            <span className="flex items-center gap-1 text-[10px] text-teal-400">
              <ShieldCheck className="w-3 h-3" /> Anonymous
            </span>
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

      </div>
    </div>
  );
};
