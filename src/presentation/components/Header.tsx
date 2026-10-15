import React from 'react';
import { MapPin, Plus, ShieldCheck, Navigation, Settings, Download, Map, Palette } from 'lucide-react';
import { Alias } from '../../domain/entities/Alias';

interface HeaderProps {
  currentAlias: Alias;
  onOpenCreateModal: () => void;
  onOpenSettingsModal: (initialTab?: 'profile' | 'themes' | 'mynotes' | 'blocked' | 'reports') => void;
  onRequestGeoLocation: () => void;
  isLocating?: boolean;
  selectedCityName?: string;
  isAppInstalled?: boolean;
  onInstallApp?: () => void;
  onToggleMapFullScreen?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentAlias,
  onOpenCreateModal,
  onOpenSettingsModal,
  onRequestGeoLocation,
  isLocating = false,
  selectedCityName,
  isAppInstalled = false,
  onInstallApp,
  onToggleMapFullScreen,
}) => {
  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-xl border-b border-slate-800/80 px-3 sm:px-6 lg:px-8 py-3 transition-colors duration-300"
      style={{ backgroundColor: 'var(--theme-header-bg)' }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="relative shrink-0">
            <img
              src="/app-icon/TALA%20Starry%20Landscape%20App%20Icon.png"
              alt="Tala App Icon"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl object-cover shadow-lg shadow-sky-500/20 ring-1 ring-white/20"
            />
            <span className="absolute -bottom-1 -right-1 flex h-2.5 w-2.5 sm:h-3 sm:w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-full w-full bg-teal-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1
                className="text-lg sm:text-xl font-extrabold tracking-tight bg-clip-text text-transparent transition-all duration-300"
                style={{ backgroundImage: 'var(--theme-gradient)' }}
              >
                Tala
              </h1>
              <span className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold tracking-wide bg-sky-500/10 text-sky-400 rounded-full border border-sky-500/20 uppercase whitespace-nowrap">
                PH Live
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Leave a note where you are
            </p>
          </div>
        </div>

        {/* Center: Selected Region/City Pill + GPS Trigger */}
        <div className="hidden md:flex items-center gap-2">
          {selectedCityName && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              <span>Where you are: <strong className="text-sky-300 font-semibold">{selectedCityName}</strong></span>
            </div>
          )}

          <button
            onClick={onRequestGeoLocation}
            disabled={isLocating}
            title="Detect my current location"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-semibold transition-all disabled:opacity-50"
          >
            <Navigation className={`w-3.5 h-3.5 text-sky-400 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Locating...' : 'Allow My Location'}</span>
          </button>
        </div>

        {/* Right actions: Install App (auto-hidden once installed) + Cached Username & Settings + Leave Note Button */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Direct PWA Install Button — removed automatically once app is installed */}
          {!isAppInstalled && onInstallApp && (
            <button
              type="button"
              onClick={onInstallApp}
              title="Install Tala App to your device"
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 text-xs font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="hidden xs:inline">Install</span>
            </button>
          )}

          {/* Mobile Full Screen Map Button */}
          {onToggleMapFullScreen && (
            <button
              onClick={onToggleMapFullScreen}
              title="Open full view map"
              className="md:hidden p-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 transition-all active:scale-95"
            >
              <Map className="w-4 h-4" />
            </button>
          )}

          {/* Mobile GPS Button */}
          <button
            onClick={onRequestGeoLocation}
            disabled={isLocating}
            title="Detect my current location"
            className="md:hidden p-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 transition-all"
          >
            <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
          </button>

          {/* Quick Theme Switcher Button */}
          <button
            onClick={() => onOpenSettingsModal('themes')}
            title="Themes (Green, Pink, Brown, Sunset, Violet...)"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-sky-300 transition-all active:scale-95 shrink-0"
          >
            <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400" />
          </button>

          {/* Cached Username Badge & Settings Trigger */}
          <button
            onClick={() => onOpenSettingsModal('profile')}
            title="Open User Settings & My Notes"
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-xs font-medium text-slate-300 transition-all"
          >
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-400 shrink-0" />
            <span className="max-w-[75px] xs:max-w-[115px] sm:max-w-[165px] truncate">{currentAlias.displayName}</span>
            <Settings className="w-3.5 h-3.5 text-slate-400 hover:text-sky-400 shrink-0" />
          </button>

          {/* Leave a Note Button */}
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-white text-xs font-semibold shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add a Note</span>
          </button>
        </div>

      </div>
    </header>
  );
};
