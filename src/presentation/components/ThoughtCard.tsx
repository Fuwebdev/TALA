import React, { useState } from 'react';
import { Heart, MessageSquare, MapPin, AlertTriangle, Share2, Award, Bookmark, Flag } from 'lucide-react';
import { Thought } from '../../domain/entities/Thought';
import { formatLocationName } from '../../domain/entities/Location';

interface ThoughtCardProps {
  thought: Thought;
  onReact: (thoughtId: string, reactionType: 'heart' | 'relate' | 'support') => void;
  onOpenComments: (thought: Thought) => void;
  onToggleSave: (thoughtId: string) => Promise<void>;
  onReport: (thought: Thought) => void;
  onSelectLocation?: (locationId: string) => void;
}

export const ThoughtCard: React.FC<ThoughtCardProps> = ({
  thought,
  onReact,
  onOpenComments,
  onToggleSave,
  onReport,
  onSelectLocation,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Environment':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'School':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Community':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Life':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(thought.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBookmark = async () => {
    setIsSaved(!isSaved);
    await onToggleSave(thought.id);
  };

  const timeAgo = (isoString: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getRemainingHours = (isoString: string) => {
    const expiresAt = new Date(isoString).getTime() + 24 * 60 * 60 * 1000;
    const diffMs = expiresAt - Date.now();
    if (diffMs <= 0) return 'Expired';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours > 0) return `${hours}h left`;
    const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    return `${mins}m left`;
  };

  return (
    <article className={`relative p-4 sm:p-5 rounded-2xl border transition-all duration-200 hover:border-slate-700/80 ${
      thought.isEnvironmentalAlert
        ? 'bg-gradient-to-b from-amber-950/20 to-slate-900/90 border-amber-500/30'
        : 'bg-slate-900/80 border-slate-800/80'
    } shadow-md overflow-hidden`}>
      
      {/* Header Info */}
      <div className="flex items-start justify-between gap-2.5 mb-3">
        
        {/* Left: Avatar + Author Handle + Timestamp/Location */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Avatar Icon */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center font-bold text-sky-400 text-sm border border-slate-700 shadow-inner shrink-0">
            {thought.authorAlias.displayName.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            {/* Author Handle & Badge */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-200 truncate max-w-[140px] xs:max-w-[200px] sm:max-w-none">
                {thought.authorAlias.displayName}
              </span>
              {thought.authorAlias.badge && (
                <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 bg-sky-500/10 text-sky-400 rounded border border-sky-500/20 font-medium shrink-0">
                  <Award className="w-2.5 h-2.5" />
                  {thought.authorAlias.badge}
                </span>
              )}
              <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded-full bg-slate-800/90 text-teal-300 border border-slate-700 font-medium shrink-0" title="Expires in 24 hours">
                🕒 {getRemainingHours(thought.createdAtISO)}
              </span>
            </div>

            {/* Time ago & Location */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 flex-wrap">
              <span className="shrink-0">{timeAgo(thought.createdAtISO)}</span>
              <span className="shrink-0">•</span>
              <button
                onClick={() => onSelectLocation?.(thought.location.id)}
                className="inline-flex items-center gap-1 hover:text-sky-400 transition-colors max-w-[150px] xs:max-w-[220px] sm:max-w-none truncate"
                title={formatLocationName(thought.location)}
              >
                <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="truncate">{formatLocationName(thought.location)}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Category Badge & Environmental Alert */}
        <div className="flex items-center gap-1.5 shrink-0">
          {thought.isEnvironmentalAlert && (
            <span className="hidden xs:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
              Eco Alert
            </span>
          )}
          <span className={`px-2.5 py-0.5 text-[10px] sm:text-[11px] font-semibold rounded-full border whitespace-nowrap ${getCategoryBadgeClass(thought.category)}`}>
            {thought.category}
          </span>
        </div>
      </div>

      {/* Body Content */}
      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed my-3 whitespace-pre-line font-normal break-words">
        {thought.body}
      </p>

      {/* Footer Reactions & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-y-2.5 gap-x-2 pt-3 mt-3 border-t border-slate-800/80 text-xs">
        
        {/* Reaction Buttons Group */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <button
            onClick={() => onReact(thought.id, 'heart')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/50 hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 transition-colors border border-transparent hover:border-rose-500/20 shrink-0"
          >
            <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="font-semibold text-slate-300">{thought.reactions.heart}</span>
          </button>

          <button
            onClick={() => onReact(thought.id, 'relate')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/50 hover:bg-sky-500/10 hover:text-sky-400 text-slate-400 transition-colors border border-transparent hover:border-sky-500/20 shrink-0"
          >
            <span className="text-xs">💬 Same</span>
            <span className="font-semibold text-slate-300">{thought.reactions.relate}</span>
          </button>

          <button
            onClick={() => onReact(thought.id, 'support')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/50 hover:bg-teal-500/10 hover:text-teal-400 text-slate-400 transition-colors border border-transparent hover:border-teal-500/20 shrink-0"
          >
            <span className="text-xs">🙌 Support</span>
            <span className="font-semibold text-slate-300">{thought.reactions.support}</span>
          </button>
        </div>

        {/* Action Tools Cluster (Comments, Bookmark, Report, Share) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 text-slate-400 shrink-0 ml-auto sm:ml-0">
          <button
            onClick={() => onOpenComments(thought)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/40 hover:bg-slate-800 hover:text-sky-400 transition-colors text-xs font-semibold"
            title="View comments"
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span>{thought.commentCount}</span>
          </button>

          <button
            onClick={handleBookmark}
            className={`p-1.5 rounded-xl hover:bg-slate-800 transition-colors ${isSaved ? 'text-amber-400' : 'hover:text-amber-400'}`}
            title="Save thought"
          >
            <Bookmark className="w-3.5 h-3.5 shrink-0" />
          </button>

          <button
            onClick={() => onReport(thought)}
            className="p-1.5 rounded-xl hover:bg-slate-800 hover:text-rose-400 transition-colors"
            title="Report content"
          >
            <Flag className="w-3.5 h-3.5 shrink-0" />
          </button>

          <button
            onClick={handleShare}
            className="p-1.5 rounded-xl hover:bg-slate-800 hover:text-sky-400 transition-colors relative"
            title="Share thought"
          >
            <Share2 className="w-3.5 h-3.5 shrink-0" />
          </button>
          {copied && <span className="text-[10px] text-teal-400 font-semibold animate-pulse">Copied!</span>}
        </div>

      </div>

    </article>
  );
};
