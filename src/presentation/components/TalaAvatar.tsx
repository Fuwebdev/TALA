import React, { useMemo } from 'react';

export type TalaAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface TalaAvatarProps {
  seed: string;
  size?: TalaAvatarSize;
  className?: string;
  shape?: 'rounded' | 'circle' | 'square';
  showGlow?: boolean;
}

// 16 curated cosmic and vibrant gradient combinations
const BACKGROUND_GRADIENTS = [
  { from: '#0284c7', to: '#0369a1', ring: 'rgba(56, 189, 248, 0.4)' }, // Cyan Sky
  { from: '#059669', to: '#047857', ring: 'rgba(52, 211, 153, 0.4)' }, // Emerald
  { from: '#7c3aed', to: '#6d28d9', ring: 'rgba(167, 139, 250, 0.4)' }, // Violet
  { from: '#db2777', to: '#be185d', ring: 'rgba(244, 114, 182, 0.4)' }, // Rose Pink
  { from: '#d97706', to: '#b45309', ring: 'rgba(251, 191, 36, 0.4)' }, // Golden Amber
  { from: '#0d9488', to: '#0f766e', ring: 'rgba(45, 212, 191, 0.4)' }, // Teal Lagoon
  { from: '#4f46e5', to: '#3730a3', ring: 'rgba(129, 140, 248, 0.4)' }, // Indigo Night
  { from: '#e11d48', to: '#9f1239', ring: 'rgba(251, 113, 133, 0.4)' }, // Crimson Ruby
  { from: '#2563eb', to: '#1d4ed8', ring: 'rgba(96, 165, 250, 0.4)' }, // Ocean Blue
  { from: '#ea580c', to: '#c2410c', ring: 'rgba(251, 146, 60, 0.4)' }, // Sunset Orange
  { from: '#9333ea', to: '#7e22ce', ring: 'rgba(192, 132, 252, 0.4)' }, // Deep Purple
  { from: '#16a34a', to: '#15803d', ring: 'rgba(74, 222, 128, 0.4)' }, // Forest Jade
  { from: '#0891b2', to: '#155e75', ring: 'rgba(34, 211, 238, 0.4)' }, // Arctic Cyan
  { from: '#c026d3', to: '#a21caf', ring: 'rgba(232, 121, 249, 0.4)' }, // Neon Magenta
  { from: '#ca8a04', to: '#a16207', ring: 'rgba(250, 204, 21, 0.4)' }, // Solar Gold
  { from: '#475569', to: '#334155', ring: 'rgba(148, 163, 184, 0.4)' }, // Slate Nebula
];

export const TALA_MASCOT_IDS = [
  'tala-star',      // 1. Tala Star Sprite
  'tarsier',        // 2. Philippine Tarsier
  'ph-eagle',       // 3. Philippine Eagle
  'night-owl',      // 4. Night Owl Scholar
  'cyber-cat',      // 5. Celestial Cat
  'astro-bot',      // 6. Retro Astrobot
  'ghost-spirit',   // 7. Anonymous Phantom
  'celestial-moon', // 8. Crescent Moon
  'space-fox',      // 9. Cosmic Fox
  'alitaptap',      // 10. Firefly Glow
  'cosmic-saturn',  // 11. Ringed Saturn
  'shooting-comet', // 12. Starlight Comet
  'pawikan',        // 13. Sea Turtle
  'midnight-coffee',// 14. Midnight Brew
  'starlight-gem',  // 15. Prismatic Crystal
  'eco-sprout',     // 16. Starlight Sprout
] as const;

export type TalaMascotId = typeof TALA_MASCOT_IDS[number];

export const TALA_MASCOT_LABELS: Record<TalaMascotId, string> = {
  'tala-star': 'Tala Star',
  'tarsier': 'Bohol Tarsier',
  'ph-eagle': 'Philippine Eagle',
  'night-owl': 'Night Owl',
  'cyber-cat': 'Cosmic Cat',
  'astro-bot': 'Astro Bot',
  'ghost-spirit': 'Ghostly Sprite',
  'celestial-moon': 'Crescent Moon',
  'space-fox': 'Starlight Fox',
  'alitaptap': 'Alitaptap Firefly',
  'cosmic-saturn': 'Planet Saturn',
  'shooting-comet': 'Shooting Star',
  'pawikan': 'Pawikan Turtle',
  'midnight-coffee': 'Midnight Coffee',
  'starlight-gem': 'Cosmic Gem',
  'eco-sprout': 'Starlight Sprout',
};

// Stable string hasher
function hashString(str: string): number {
  let hash = 2166136261;
  const safeStr = str || 'anon-tala';
  for (let i = 0; i < safeStr.length; i++) {
    hash ^= safeStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

const SIZE_MAP: Record<TalaAvatarSize, { px: number; cls: string; stroke: number }> = {
  xs: { px: 20, cls: 'w-5 h-5', stroke: 1.5 },
  sm: { px: 28, cls: 'w-7 h-7', stroke: 1.5 },
  md: { px: 36, cls: 'w-9 h-9', stroke: 2 },
  lg: { px: 44, cls: 'w-11 h-11', stroke: 2 },
  xl: { px: 56, cls: 'w-14 h-14', stroke: 2.2 },
  '2xl': { px: 76, cls: 'w-[76px] h-[76px]', stroke: 2.5 },
};

export const TalaAvatar: React.FC<TalaAvatarProps> = ({
  seed,
  size = 'md',
  className = '',
  shape = 'rounded',
  showGlow = false,
}) => {
  const { mascotId, bg, sparkleId } = useMemo(() => {
    // If the seed directly specifies a mascot prefix like `mascot-tarsier`, respect it
    let forcedMascot: TalaMascotId | null = null;
    for (const id of TALA_MASCOT_IDS) {
      if (seed && seed.includes(`mascot-${id}`)) {
        forcedMascot = id;
        break;
      }
    }

    const hash = hashString(seed);
    const bgIndex = hash % BACKGROUND_GRADIENTS.length;
    const mascotIndex = (hash >> 4) % TALA_MASCOT_IDS.length;
    const sparkleIndex = (hash >> 8) % 4;

    return {
      mascotId: forcedMascot || TALA_MASCOT_IDS[mascotIndex],
      bg: BACKGROUND_GRADIENTS[bgIndex],
      sparkleId: sparkleIndex,
    };
  }, [seed]);

  const sizeInfo = SIZE_MAP[size];
  const roundedClass =
    shape === 'circle' ? 'rounded-full' : shape === 'square' ? 'rounded-lg' : 'rounded-2xl';

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden select-none border border-white/20 shadow-md ${roundedClass} ${sizeInfo.cls} ${className}`}
      style={{
        background: `linear-gradient(135deg, ${bg.from} 0%, ${bg.to} 100%)`,
        boxShadow: showGlow ? `0 0 16px ${bg.ring}` : undefined,
      }}
      title={`Anonymous Avatar: ${TALA_MASCOT_LABELS[mascotId]}`}
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full p-1"
      >
        <defs>
          <filter id={`glow-${mascotId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Ambient Star Sparkles in background */}
        <g opacity="0.35" fill="#ffffff">
          {sparkleId === 0 && (
            <>
              <circle cx="14" cy="14" r="1.5" />
              <circle cx="50" cy="18" r="1" />
              <circle cx="48" cy="48" r="1.2" />
            </>
          )}
          {sparkleId === 1 && (
            <>
              <circle cx="16" cy="46" r="1.3" />
              <circle cx="48" cy="14" r="1.5" />
              <circle cx="12" cy="22" r="0.9" />
            </>
          )}
          {sparkleId === 2 && (
            <>
              <circle cx="52" cy="46" r="1.5" />
              <circle cx="12" cy="14" r="1.2" />
              <circle cx="32" cy="10" r="1" />
            </>
          )}
          {sparkleId === 3 && (
            <>
              <circle cx="18" cy="50" r="1.4" />
              <circle cx="46" cy="52" r="1" />
              <circle cx="50" cy="12" r="1.3" />
            </>
          )}
        </g>

        {/* Mascot Vector Render */}
        <g filter={`url(#glow-${mascotId})`}>
          {renderMascotSvg(mascotId)}
        </g>
      </svg>
    </div>
  );
};

function renderMascotSvg(id: TalaMascotId) {
  switch (id) {
    case 'tala-star':
      return (
        <g>
          {/* Glowing 4-point Tala Star with cute smiling face */}
          <path
            d="M32 8 C32 20, 20 32, 8 32 C20 32, 32 44, 32 56 C32 44, 44 32, 56 32 C44 32, 32 20, 32 8 Z"
            fill="#FDE047"
            stroke="#FEF08A"
            strokeWidth="1.5"
          />
          <path
            d="M32 18 C32 26, 26 32, 18 32 C26 32, 32 38, 32 46 C32 38, 38 32, 46 32 C38 32, 32 26, 32 18 Z"
            fill="#FEF9C3"
            opacity="0.6"
          />
          <circle cx="27" cy="31" r="2.2" fill="#1E293B" />
          <circle cx="37" cy="31" r="2.2" fill="#1E293B" />
          <circle cx="27.8" cy="30.2" r="0.8" fill="#FFFFFF" />
          <circle cx="37.8" cy="30.2" r="0.8" fill="#FFFFFF" />
          <ellipse cx="23" cy="35" rx="2" ry="1.2" fill="#F472B6" opacity="0.8" />
          <ellipse cx="41" cy="35" rx="2" ry="1.2" fill="#F472B6" opacity="0.8" />
          <path d="M30 35 Q32 38 34 35" stroke="#1E293B" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      );

    case 'tarsier':
      return (
        <g>
          {/* Philippine Tarsier: Big cute ears & giant curious eyes */}
          <ellipse cx="14" cy="24" rx="8" ry="11" fill="#78350F" />
          <ellipse cx="14" cy="24" rx="5" ry="7" fill="#FBBF24" opacity="0.6" />
          <ellipse cx="50" cy="24" rx="8" ry="11" fill="#78350F" />
          <ellipse cx="50" cy="24" rx="5" ry="7" fill="#FBBF24" opacity="0.6" />
          <ellipse cx="32" cy="35" rx="19" ry="17" fill="#92400E" />
          <circle cx="24" cy="34" r="7.5" fill="#FEF08A" stroke="#78350F" strokeWidth="1" />
          <circle cx="40" cy="34" r="7.5" fill="#FEF08A" stroke="#78350F" strokeWidth="1" />
          <circle cx="24" cy="34" r="5" fill="#0F172A" />
          <circle cx="40" cy="34" r="5" fill="#0F172A" />
          <circle cx="22" cy="32" r="2" fill="#FFFFFF" />
          <circle cx="25.5" cy="35.5" r="1" fill="#FFFFFF" />
          <circle cx="38" cy="32" r="2" fill="#FFFFFF" />
          <circle cx="41.5" cy="35.5" r="1" fill="#FFFFFF" />
          <ellipse cx="32" cy="42" rx="1.5" ry="1" fill="#451A03" />
          <path d="M30 45 Q32 47 34 45" stroke="#451A03" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      );

    case 'ph-eagle':
      return (
        <g>
          {/* Philippine Eagle: Crest of feathers & sharp majestic gaze */}
          <path d="M32 10 L30 18 L34 18 Z" fill="#D97706" />
          <path d="M25 12 L27 20 L23 20 Z" fill="#B45309" />
          <path d="M39 12 L37 20 L41 20 Z" fill="#B45309" />
          <path d="M19 16 L23 22 L17 22 Z" fill="#92400E" />
          <path d="M45 16 L41 22 L47 22 Z" fill="#92400E" />
          <ellipse cx="32" cy="34" rx="18" ry="16" fill="#F8FAFC" />
          <path d="M18 29 Q24 28 28 32" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M46 29 Q40 28 36 32" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="24" cy="33" r="3" fill="#38BDF8" />
          <circle cx="24" cy="33" r="1.5" fill="#0F172A" />
          <circle cx="40" cy="33" r="3" fill="#38BDF8" />
          <circle cx="40" cy="33" r="1.5" fill="#0F172A" />
          <path d="M28 37 C28 37, 32 37, 36 37 C36 43, 34 49, 32 51 C30 49, 28 43, 28 37 Z" fill="#1E293B" />
          <path d="M32 40 L32 50" stroke="#0F172A" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      );

    case 'night-owl':
      return (
        <g>
          {/* Night Owl: Wise tufted ears and huge glowing eyes */}
          <path d="M16 26 L22 14 L28 24 Z" fill="#64748B" />
          <path d="M48 26 L42 14 L36 24 Z" fill="#64748B" />
          <ellipse cx="32" cy="36" rx="19" ry="17" fill="#475569" />
          <ellipse cx="32" cy="40" rx="13" ry="11" fill="#E2E8F0" />
          <circle cx="24" cy="34" r="7" fill="#FACC15" stroke="#334155" strokeWidth="1.5" />
          <circle cx="40" cy="34" r="7" fill="#FACC15" stroke="#334155" strokeWidth="1.5" />
          <circle cx="24" cy="34" r="4" fill="#0F172A" />
          <circle cx="40" cy="34" r="4" fill="#0F172A" />
          <circle cx="22.5" cy="32.5" r="1.5" fill="#FFFFFF" />
          <circle cx="38.5" cy="32.5" r="1.5" fill="#FFFFFF" />
          <polygon points="32,38 29,43 35,43" fill="#F97316" />
        </g>
      );

    case 'cyber-cat':
      return (
        <g>
          {/* Cyber / Cosmic Cat */}
          <polygon points="17,30 20,13 30,25" fill="#F43F5E" />
          <polygon points="21,26 22,17 28,24" fill="#FECDD3" />
          <polygon points="47,30 44,13 34,25" fill="#F43F5E" />
          <polygon points="43,26 42,17 36,24" fill="#FECDD3" />
          <ellipse cx="32" cy="37" rx="18" ry="15" fill="#1E293B" stroke="#F43F5E" strokeWidth="1" />
          <ellipse cx="24" cy="35" rx="3.5" ry="4" fill="#38BDF8" />
          <ellipse cx="40" cy="35" rx="3.5" ry="4" fill="#38BDF8" />
          <ellipse cx="24" cy="35" rx="1.5" ry="3.5" fill="#0F172A" />
          <ellipse cx="40" cy="35" rx="1.5" ry="3.5" fill="#0F172A" />
          <circle cx="25.5" cy="33.5" r="1" fill="#FFFFFF" />
          <circle cx="41.5" cy="33.5" r="1" fill="#FFFFFF" />
          <polygon points="32,41 30.5,39 33.5,39" fill="#FB7185" />
          <path d="M29 43 Q30.5 45 32 43 Q33.5 45 35 43" stroke="#CBD5E1" strokeWidth="1.3" strokeLinecap="round" fill="none" />
          <line x1="12" y1="38" x2="19" y2="39" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="12" y1="42" x2="19" y2="41" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="52" y1="38" x2="45" y2="39" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="52" y1="42" x2="45" y2="41" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      );

    case 'astro-bot':
      return (
        <g>
          {/* Astrobot: Antenna with blinking light and friendly screen face */}
          <line x1="32" y1="12" x2="32" y2="20" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="32" cy="11" r="3.5" fill="#38BDF8" stroke="#E2E8F0" strokeWidth="1" />
          <rect x="10" y="29" width="4" height="8" rx="2" fill="#64748B" />
          <rect x="50" y="29" width="4" height="8" rx="2" fill="#64748B" />
          <rect x="13" y="20" width="38" height="28" rx="8" fill="#334155" stroke="#94A3B8" strokeWidth="1.5" />
          <rect x="17" y="24" width="30" height="20" rx="5" fill="#0F172A" />
          <path d="M22 32 Q25 28 28 32" stroke="#2DD4BF" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M36 32 Q39 28 42 32" stroke="#2DD4BF" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M29 38 Q32 41 35 38" stroke="#38BDF8" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </g>
      );

    case 'ghost-spirit':
      return (
        <g>
          {/* Anonymous Floating Spirit with gentle blush & starry glow */}
          <path
            d="M18 36 C18 22, 24 14, 32 14 C40 14, 46 22, 46 36 C46 45, 43 47, 40 45 C37 43, 35 46, 32 45 C29 44, 27 47, 24 45 C21 47, 18 44, 18 36 Z"
            fill="#F8FAFC"
            stroke="#E2E8F0"
            strokeWidth="1.2"
          />
          <ellipse cx="27" cy="28" rx="2.5" ry="3.2" fill="#0F172A" />
          <ellipse cx="37" cy="28" rx="2.5" ry="3.2" fill="#0F172A" />
          <circle cx="28" cy="26.8" r="1.1" fill="#FFFFFF" />
          <circle cx="38" cy="26.8" r="1.1" fill="#FFFFFF" />
          <ellipse cx="23" cy="33" rx="2.5" ry="1.5" fill="#FDA4AF" opacity="0.8" />
          <ellipse cx="41" cy="33" rx="2.5" ry="1.5" fill="#FDA4AF" opacity="0.8" />
          <ellipse cx="32" cy="33" rx="1.5" ry="2" fill="#0F172A" />
        </g>
      );

    case 'celestial-moon':
      return (
        <g>
          {/* Crescent Moon sleeping amidst stars */}
          <path
            d="M38 12 C24 15, 17 28, 20 42 C23 54, 35 56, 44 50 C32 50, 26 38, 28 26 C30 18, 35 14, 38 12 Z"
            fill="#FEF08A"
            stroke="#FDE047"
            strokeWidth="1.5"
          />
          <path d="M26 31 Q28 34 31 32" stroke="#713F12" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <ellipse cx="29" cy="37" rx="2" ry="1.2" fill="#FB923C" opacity="0.7" />
          <polygon points="45,22 47,26 51,26 48,29 49,33 45,30 41,33 42,29 39,26 43,26" fill="#F8FAFC" />
        </g>
      );

    case 'space-fox':
      return (
        <g>
          {/* Celestial Fox */}
          <polygon points="14,28 17,11 29,22" fill="#EA580C" />
          <polygon points="18,25 19,16 26,22" fill="#FFFFFF" />
          <polygon points="50,28 47,11 35,22" fill="#EA580C" />
          <polygon points="46,25 45,16 38,22" fill="#FFFFFF" />
          <polygon points="32,48 16,30 48,30" fill="#F97316" />
          <polygon points="32,48 18,34 32,38" fill="#FFFFFF" />
          <polygon points="32,48 46,34 32,38" fill="#FFFFFF" />
          <path d="M22 30 Q26 28 28 32" stroke="#1E293B" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M42 30 Q38 28 36 32" stroke="#1E293B" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <circle cx="32" cy="46" r="2" fill="#0F172A" />
        </g>
      );

    case 'alitaptap':
      return (
        <g>
          {/* Philippine Firefly / Alitaptap */}
          <ellipse cx="22" cy="24" rx="10" ry="6" transform="rotate(-30 22 24)" fill="#BAE6FD" opacity="0.6" stroke="#E0F2FE" strokeWidth="1" />
          <ellipse cx="42" cy="24" rx="10" ry="6" transform="rotate(30 42 24)" fill="#BAE6FD" opacity="0.6" stroke="#E0F2FE" strokeWidth="1" />
          <ellipse cx="32" cy="27" rx="7" ry="8" fill="#334155" />
          <ellipse cx="32" cy="43" rx="10" ry="10" fill="#FACC15" />
          <ellipse cx="32" cy="43" rx="6" ry="6" fill="#FEF08A" />
          <path d="M28 20 Q24 14 20 16" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M36 20 Q40 14 44 16" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <circle cx="29" cy="26" r="1.8" fill="#F8FAFC" />
          <circle cx="35" cy="26" r="1.8" fill="#F8FAFC" />
          <circle cx="29" cy="26" r="1" fill="#0F172A" />
          <circle cx="35" cy="26" r="1" fill="#0F172A" />
        </g>
      );

    case 'cosmic-saturn':
      return (
        <g>
          {/* Planet Saturn with orbital rings */}
          <ellipse cx="32" cy="34" rx="26" ry="7" transform="rotate(-20 32 34)" stroke="#FDE047" strokeWidth="3" opacity="0.5" fill="none" />
          <circle cx="32" cy="34" r="16" fill="#F59E0B" />
          <path
            d="M8 43 C14 50, 42 38, 56 25"
            stroke="#FEF08A"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="28" cy="32" r="2" fill="#78350F" />
          <circle cx="36" cy="32" r="2" fill="#78350F" />
          <path d="M30 36 Q32 39 34 36" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </g>
      );

    case 'shooting-comet':
      return (
        <g>
          {/* Speeding comet with trail */}
          <path d="M12 12 Q24 24 34 34" stroke="#FDE047" strokeWidth="6" strokeLinecap="round" opacity="0.6" />
          <path d="M8 20 Q20 30 28 38" stroke="#F43F5E" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
          <path d="M20 8 Q28 18 38 26" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
          <circle cx="38" cy="38" r="14" fill="#FBBF24" stroke="#FEF08A" strokeWidth="1.5" />
          <circle cx="34" cy="37" r="2" fill="#451A03" />
          <circle cx="42" cy="37" r="2" fill="#451A03" />
          <circle cx="35" cy="36" r="0.8" fill="#FFFFFF" />
          <circle cx="43" cy="36" r="0.8" fill="#FFFFFF" />
          <path d="M36 42 Q38 45 40 42" stroke="#451A03" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        </g>
      );

    case 'pawikan':
      return (
        <g>
          {/* Pawikan Sea Turtle */}
          <ellipse cx="16" cy="22" rx="7" ry="4" transform="rotate(-40 16 22)" fill="#10B981" />
          <ellipse cx="48" cy="22" rx="7" ry="4" transform="rotate(40 48 22)" fill="#10B981" />
          <ellipse cx="20" cy="46" rx="5" ry="3" transform="rotate(30 20 46)" fill="#059669" />
          <ellipse cx="44" cy="46" rx="5" ry="3" transform="rotate(-30 44 46)" fill="#059669" />
          <ellipse cx="32" cy="18" rx="7" ry="6" fill="#34D399" />
          <circle cx="29" cy="17" r="1.3" fill="#064E3B" />
          <circle cx="35" cy="17" r="1.3" fill="#064E3B" />
          <ellipse cx="32" cy="35" rx="16" ry="14" fill="#047857" stroke="#6EE7B7" strokeWidth="1.5" />
          <polygon points="32,26 34,31 39,31 35,34 37,39 32,36 27,39 29,34 25,31 30,31" fill="#A7F3D0" />
        </g>
      );

    case 'midnight-coffee':
      return (
        <g>
          {/* Midnight Coffee / Boba */}
          <path d="M20 22 L23 48 C23 51, 41 51, 41 48 L44 22 Z" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5" />
          <path d="M22 28 L24 46 C24 48, 40 48, 40 46 L42 28 Z" fill="#78350F" />
          <line x1="32" y1="10" x2="32" y2="28" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="32" cy="22" rx="13" ry="3.5" fill="#0284C7" />
          <circle cx="28" cy="36" r="1.8" fill="#FEF08A" />
          <circle cx="36" cy="36" r="1.8" fill="#FEF08A" />
          <path d="M30 40 Q32 42 34 40" stroke="#FEF08A" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </g>
      );

    case 'starlight-gem':
      return (
        <g>
          {/* Prismatic Starlight Crystal Gem */}
          <polygon points="32,10 48,22 42,50 32,56 22,50 16,22" fill="#818CF8" stroke="#C7D2FE" strokeWidth="1.5" />
          <polygon points="32,10 48,22 32,32 16,22" fill="#A5B4FC" />
          <polygon points="32,32 48,22 42,50" fill="#6366F1" />
          <polygon points="32,32 16,22 22,50" fill="#4F46E5" />
          <polygon points="32,32 42,50 32,56 22,50" fill="#4338CA" />
          <polygon points="32,18 34,22 38,22 35,25 36,29 32,27 28,29 29,25 26,22 30,22" fill="#FFFFFF" />
        </g>
      );

    case 'eco-sprout':
      return (
        <g>
          {/* Starlight Eco Sprout */}
          <ellipse cx="32" cy="46" rx="14" ry="5" fill="#334155" />
          <path d="M32 46 Q32 32 32 26" stroke="#4ADE80" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path d="M32 28 C22 28, 16 18, 22 14 C28 14, 32 22, 32 28 Z" fill="#22C55E" />
          <path d="M32 28 C42 28, 48 18, 42 14 C36 14, 32 22, 32 28 Z" fill="#4ADE80" />
          <circle cx="32" cy="22" r="2.5" fill="#38BDF8" stroke="#E0F2FE" strokeWidth="1" />
        </g>
      );

    default:
      return null;
  }
}
