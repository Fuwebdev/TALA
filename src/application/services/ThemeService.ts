export type ThemeId = 'default' | 'green' | 'pink' | 'brown' | 'purple' | 'sunset';

export interface TalaTheme {
  id: ThemeId;
  name: string;
  tagline: string;
  emoji: string;
  previewColors: [string, string];
  accentHex: string;
  bgHex: string;
}

export const TALA_THEMES: TalaTheme[] = [
  {
    id: 'default',
    name: 'Oceanic Tala',
    tagline: 'Classic starry skies and azure waters',
    emoji: '🌊',
    previewColors: ['#0ea5e9', '#14b8a6'],
    accentHex: '#38bdf8',
    bgHex: '#030712',
  },
  {
    id: 'green',
    name: 'Forest Green',
    tagline: 'Lush rainforests, jade flora & emerald pines',
    emoji: '🌿',
    previewColors: ['#10b981', '#059669'],
    accentHex: '#34d399',
    bgHex: '#021a12',
  },
  {
    id: 'pink',
    name: 'Sakura Pink',
    tagline: 'Vibrant cherry blossoms, rose & bubblegum',
    emoji: '🌸',
    previewColors: ['#ec4899', '#f43f5e'],
    accentHex: '#f472b6',
    bgHex: '#180312',
  },
  {
    id: 'brown',
    name: 'Warm Mocha',
    tagline: 'Barako coffee, caramel, wood & earthy tones',
    emoji: '☕',
    previewColors: ['#d97706', '#92400e'],
    accentHex: '#fbbf24',
    bgHex: '#150a04',
  },
  {
    id: 'sunset',
    name: 'Golden Sunset',
    tagline: 'Manila bay golden hour, amber & coral radiance',
    emoji: '🌅',
    previewColors: ['#f97316', '#e11d48'],
    accentHex: '#fb923c',
    bgHex: '#160706',
  },
  {
    id: 'purple',
    name: 'Neon Violet',
    tagline: 'Cyberpunk twilight, electric orchid & lavender',
    emoji: '💜',
    previewColors: ['#8b5cf6', '#c026d3'],
    accentHex: '#a78bfa',
    bgHex: '#0e051c',
  },
];

const THEME_STORAGE_KEY = 'tala_theme_v1';

export class ThemeService {
  public static getSavedTheme(): ThemeId {
    if (typeof window === 'undefined') return 'default';
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
      if (saved && TALA_THEMES.some((t) => t.id === saved)) {
        return saved;
      }
    } catch {
      // Ignore
    }
    return 'default';
  }

  public static applyTheme(themeId: ThemeId): void {
    if (typeof document === 'undefined') return;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    } catch {}

    document.documentElement.setAttribute('data-theme', themeId);
    if (document.body) {
      document.body.setAttribute('data-theme', themeId);
    }

    // Broadcast theme update event across window
    window.dispatchEvent(new CustomEvent('tala-theme-change', { detail: { themeId } }));
  }

  public static initTheme(): ThemeId {
    const theme = this.getSavedTheme();
    this.applyTheme(theme);
    return theme;
  }
}
