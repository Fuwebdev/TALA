import React from 'react';
import { MapPin, Plus, ShieldCheck, Navigation, Settings, Download, Map, Palette } from 'lucide-react';
import { Alias } from '../../domain/entities/Alias';
import { PhilippineFlag } from './PhilippineFlag';

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
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-4">
        
        {/* Brand */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="relative shrink-0">
            <img
              src="/app-icon/TALA%20Starry%20Landscape%20App%20Icon.png"
              alt="Tala App Icon"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl object-cover shadow-md shadow-sky-500/20 ring-1 ring-white/20"
            />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2 sm:h-2.5 sm:w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-full w-full bg-teal-500"></span>
            </span>
          </div>

          <div className="shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1
                className="text-base sm:text-xl font-extrabold tracking-tight bg-clip-text text-transparent transition-all duration-300"
                style={{ backgroundImage: 'var(--theme-gradient)' }}
              >
                Tala
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold tracking-wide bg-sky-500/10 text-sky-400 rounded-full border border-sky-500/20 uppercase whitespace-nowrap">
                <PhilippineFlag className="w-3.5 h-2.5" />
                <span>PH Live</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden md:block">
              Leave a note where you are
            </p>
          </div>
        </div>

        {/* Center: Selected Region/City Pill + GPS Trigger (Desktop / Tablet) */}
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

        {/* Right actions: Compact & responsive for all viewports */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Direct PWA Install Button — hidden on mobile to preserve layout */}
          {!isAppInstalled && onInstallApp && (
            <button
              type="button"
              onClick={onInstallApp}
              title="Install Tala App to your device"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 text-xs font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Install</span>
            </button>
          )}

          {/* GPS Button */}
          <button
            onClick={onRequestGeoLocation}
            disabled={isLocating}
            title="Detect my current location"
            className="p-1.5 sm:p-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 transition-all active:scale-95 shrink-0"
          >
            <Navigation className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLocating ? 'animate-spin' : ''}`} />
          </button>

          {/* Quick Theme Switcher Button */}
          <button
            onClick={() => onOpenSettingsModal('themes')}
            title="Themes (Green, Pink, Brown, Sunset, Violet...)"
            className="p-1.5 sm:p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-sky-300 transition-all active:scale-95 shrink-0"
          >
            <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400" />
          </button>

          {/* Cached Username Badge & Settings Trigger */}
          <button
            onClick={() => onOpenSettingsModal('profile')}
            title={`User Settings: ${currentAlias.displayName}`}
            className="flex items-center gap-1 sm:gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-xs font-medium text-slate-300 transition-all active:scale-95 shrink-0"
          >
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-400 shrink-0" />
            <span className="hidden sm:inline-block max-w-[120px] truncate">{currentAlias.displayName}</span>
            <Settings className="w-3.5 h-3.5 text-slate-400 hover:text-sky-400 shrink-0 hidden sm:inline-block" />
          </button>

          {/* Leave a Note Button */}
          <button
            onClick={onOpenCreateModal}
            title="Add a Note"
            className="flex items-center gap-1 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-white text-xs font-semibold shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden xs:inline">Note</span>
          </button>
        </div>

      </div>
    </header>
  );
};
