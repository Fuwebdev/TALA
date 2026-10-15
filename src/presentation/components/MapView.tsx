import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { PHILIPPINES_MAP_OPTIONS } from '../../infrastructure/maps/maplibre-config';
import { Location } from '../../domain/entities/Location';
import { Thought } from '../../domain/entities/Thought';
import { ThemeService } from '../../application/services/ThemeService';
import { PhilippineFlag } from './PhilippineFlag';
import {
  Shield,
  Navigation,
  Maximize2,
  Minimize2,
  ArrowLeft,
  Plus,
  MessageSquare,
  X,
  MapPin,
  Heart,
  Clock,
  Sparkles,
} from 'lucide-react';

interface MapViewProps {
  locations: Location[];
  thoughts: Thought[];
  selectedLocation?: Location | null;
  userGpsCoords?: { lat: number; lng: number } | null;
  highlightedThoughtId?: string | null;
  onSelectLocation?: (location: Location) => void;
  onSelectThought?: (thought: Thought) => void;
  onRequestGeoLocation?: () => void;
  isLocating?: boolean;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  onOpenCreateModal?: () => void;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const MapView: React.FC<MapViewProps> = ({
  locations,
  thoughts,
  selectedLocation,
  userGpsCoords,
  highlightedThoughtId = null,
  onSelectLocation,
  onSelectThought,
  onRequestGeoLocation,
  isLocating = false,
  isFullScreen: controlledFullScreen,
  onToggleFullScreen,
  onOpenCreateModal,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [internalFullScreen, setInternalFullScreen] = useState(false);
  const [selectedThoughtPreview, setSelectedThoughtPreview] = useState<Thought | null>(null);
  const [activeTheme, setActiveTheme] = useState<string>(() => ThemeService.getSavedTheme());

  useEffect(() => {
    const handleThemeChange = (e: any) => {
      if (e.detail?.themeId) {
        setActiveTheme(e.detail.themeId);
      }
    };
    window.addEventListener('tala-theme-change', handleThemeChange);
    return () => window.removeEventListener('tala-theme-change', handleThemeChange);
  }, []);

  const isFullScreen = controlledFullScreen !== undefined ? controlledFullScreen : internalFullScreen;

  const toggleFullScreen = () => {
    if (onToggleFullScreen) {
      onToggleFullScreen();
    } else {
      setInternalFullScreen((prev) => !prev);
    }
  };

  // Re-trigger map resize on fullscreen transition or window resize so map canvas adapts instantly
  useEffect(() => {
    const timer = setTimeout(() => {
      mapRef.current?.resize();
      try {
        if (mapRef.current && (mapRef.current as any).setCooperativeGestures) {
          (mapRef.current as any).setCooperativeGestures(!isFullScreen);
        }
      } catch {}
    }, 150);
    return () => clearTimeout(timer);
  }, [isFullScreen]);

  useEffect(() => {
    const handleResize = () => {
      mapRef.current?.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    try {
      const initialCenter: [number, number] = userGpsCoords
        ? [userGpsCoords.lng, userGpsCoords.lat]
        : selectedLocation
        ? [selectedLocation.coordinates.lng, selectedLocation.coordinates.lat]
        : PHILIPPINES_MAP_OPTIONS.center;

      const initialZoom = userGpsCoords || selectedLocation ? 12 : PHILIPPINES_MAP_OPTIONS.zoom;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        ...PHILIPPINES_MAP_OPTIONS,
        center: initialCenter,
        zoom: initialZoom,
        cooperativeGestures: !isFullScreen,
      });

      map.on('load', () => {
        setMapLoaded(true);
      });

      mapRef.current = map;

      return () => {
        markersRef.current.forEach(m => m.remove());
        userMarkerRef.current?.remove();
        map.remove();
      };
    } catch (err) {
      console.warn('MapLibre GL failed to initialize in this environment:', err);
    }
  }, []);

  // Render Lollipop Icon Pins & Floating Note Cards on the Map (Always renders all notes, even outside radius!)
  useEffect(() => {
    const activeMap = mapRef.current;
    if (!activeMap) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // 1. Render every Thought/Note directly on the map with its distinct lollipop icon & note bubble
    thoughts.forEach((thought) => {
      const lat = thought.location?.coordinates?.lat;
      const lng = thought.location?.coordinates?.lng;
      if (typeof lat !== 'number' || typeof lng !== 'number') return;

      const isHighlighted = thought.id === highlightedThoughtId;

      // Slight deterministic offset if multiple notes share identical coordinates
      const sameLocNotes = thoughts.filter(t => t.location.id === thought.location.id);
      const posInGroup = sameLocNotes.findIndex(t => t.id === thought.id);
      const offsetLat = posInGroup > 0 ? Math.sin(posInGroup * 2.1) * 0.007 * posInGroup : 0;
      const offsetLng = posInGroup > 0 ? Math.cos(posInGroup * 2.1) * 0.007 * posInGroup : 0;

      const safeAlias = escapeHtml(thought.authorAlias.displayName);
      const safeBody = escapeHtml(thought.body);
      const safeCity = escapeHtml(thought.location.cityMunicipality);
      const safeCategory = escapeHtml(thought.category);
      const previewBody = safeBody.length > 55 ? safeBody.slice(0, 55) + '...' : safeBody;

      const expiresAt = new Date(thought.createdAtISO).getTime() + 24 * 60 * 60 * 1000;
      const diffMs = expiresAt - Date.now();
      const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
      const minsLeft = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      const remainingLabel = diffMs <= 0 ? 'Expired' : hoursLeft > 0 ? `${hoursLeft}h` : `${minsLeft}m`;

      const el = document.createElement('div');
      el.className = `${isHighlighted ? 'z-50' : 'z-20'} cursor-pointer group`;

      el.innerHTML = `
        <div class="relative flex flex-col items-center transition-all duration-300 hover:scale-105 ${
          isHighlighted ? 'scale-110 animate-bounce' : ''
        }">
          <!-- Floating Note Card Bubble on Map -->
          <div class="max-w-[200px] sm:max-w-[230px] px-3 py-2 rounded-2xl bg-slate-950/95 backdrop-blur-md border ${
            isHighlighted
              ? 'border-teal-400 ring-2 ring-teal-400/50 shadow-2xl shadow-teal-500/40'
              : thought.isEnvironmentalAlert
              ? 'border-amber-400/80 shadow-lg shadow-amber-500/20'
              : 'border-[var(--theme-border)] shadow-lg shadow-[var(--theme-glow)]'
          } text-left space-y-1">
            <div class="flex items-center justify-between gap-1.5">
              <span class="text-[10px] font-bold truncate" style="color: var(--theme-accent);">${safeAlias}</span>
              ${
                isHighlighted
                  ? '<span class="px-1.5 py-0.2 rounded-full bg-teal-500/25 text-teal-300 text-[8px] font-extrabold uppercase tracking-wide">Just Posted</span>'
                  : ''
              }
              <span class="px-1.5 py-0.2 rounded-full text-[9px] font-semibold shrink-0" style="background: var(--theme-badge-bg); color: var(--theme-accent);">${safeCategory}</span>
            </div>
            <p class="text-[11px] text-white font-medium leading-snug break-words">"${previewBody}"</p>
            <div class="flex items-center justify-between text-[9px] text-slate-400 pt-0.5">
              <span class="truncate">📍 ${safeCity} • 🕒 ${remainingLabel}</span>
              <span class="shrink-0">❤️ ${thought.reactions.heart} 💬 ${thought.commentCount}</span>
            </div>
          </div>

          <!-- Lollipop Stem (Stick) -->
          <div class="w-1 h-3.5 ${
            isHighlighted
              ? 'bg-gradient-to-b from-teal-300 to-teal-500 shadow-sm'
              : thought.isEnvironmentalAlert
              ? 'bg-gradient-to-b from-amber-400 to-amber-600 shadow-sm'
              : 'shadow-sm'
          }" ${!isHighlighted && !thought.isEnvironmentalAlert ? 'style="background: var(--theme-gradient);"' : ''}></div>

          <!-- Lollipop Pinhead / Dot on Coordinates -->
          <div class="relative flex items-center justify-center -mt-0.5">
            ${
              isHighlighted
                ? '<span class="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-teal-400 opacity-75"></span>'
                : ''
            }
            <div class="w-4 h-4 rounded-full ${
              isHighlighted
                ? 'bg-teal-400 ring-4 ring-teal-500/60 shadow-xl'
                : thought.isEnvironmentalAlert
                ? 'bg-amber-400 ring-2 ring-slate-950 shadow-md'
                : 'ring-2 ring-slate-950 shadow-md'
            } flex items-center justify-center" ${!isHighlighted && !thought.isEnvironmentalAlert ? 'style="background: var(--theme-accent);"' : ''}>
              <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
            </div>
          </div>
        </div>
      `;

      // Full Details Popup when clicked
      const popupHtml = `
        <div style="font-family: 'Century Gothic', sans-serif; color: #f8fafc; background: #0f172a; padding: 10px; border-radius: 12px; max-width: 240px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 6px;">
            <strong style="font-size: 11px; color: #2dd4bf;">${safeAlias}</strong>
            <span style="font-size: 9px; background: rgba(14,165,233,0.2); color: #38bdf8; padding: 2px 6px; border-radius: 999px;">${safeCategory}</span>
          </div>
          <p style="font-size: 12px; line-height: 1.45; color: #f1f5f9; margin: 0 0 8px 0; white-space: pre-line;">${safeBody}</p>
          <div style="font-size: 10px; color: #94a3b8; border-top: 1px solid #1e293b; padding-top: 6px; display: flex; justify-content: space-between;">
            <span>📍 ${safeCity}</span>
            <span>❤️ ${thought.reactions.heart}</span>
          </div>
        </div>
      `;

      const popup = new maplibregl.Popup({
        offset: 32,
        closeButton: false,
        className: 'tala-map-popup',
      }).setHTML(popupHtml);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedThoughtPreview(thought);
        onSelectThought?.(thought);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([lng + offsetLng, lat + offsetLat])
        .setPopup(popup)
        .addTo(activeMap);

      markersRef.current.push(marker);
    });

    // 2. Render subtle city pins for locations that don't have notes currently displayed
    locations.forEach(loc => {
      const hasNoteRendered = thoughts.some(t => t.location.id === loc.id);
      if (hasNoteRendered) return;

      const el = document.createElement('div');
      el.className = 'cursor-pointer';
      const isSelected = selectedLocation?.id === loc.id;

      el.innerHTML = `
        <div class="w-6 h-6 rounded-full ${
          isSelected ? 'bg-teal-500 ring-4 ring-teal-400/30 scale-110' : 'bg-slate-900/90 border border-slate-700'
        } shadow-md flex items-center justify-center text-[10px] transition-transform hover:scale-125" title="${escapeHtml(loc.cityMunicipality)}">
          📍
        </div>
      `;

      el.addEventListener('click', () => {
        onSelectLocation?.(loc);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([loc.coordinates.lng, loc.coordinates.lat])
        .addTo(activeMap);

      markersRef.current.push(marker);
    });
  }, [locations, thoughts, selectedLocation, highlightedThoughtId, mapLoaded, activeTheme]);

  // Render Live User Location Beacon when allowed
  useEffect(() => {
    const activeMap = mapRef.current;
    if (!activeMap || !userGpsCoords) return;

    userMarkerRef.current?.remove();

    const userEl = document.createElement('div');
    userEl.innerHTML = `
      <div class="relative flex items-center justify-center" title="Your Exact GPS Location">
        <span class="animate-ping absolute inline-flex h-7 w-7 rounded-full bg-emerald-400 opacity-75"></span>
        <div class="w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white shadow-lg"></div>
      </div>
    `;

    userMarkerRef.current = new maplibregl.Marker({ element: userEl })
      .setLngLat([userGpsCoords.lng, userGpsCoords.lat])
      .addTo(activeMap);
  }, [userGpsCoords, mapLoaded]);

  // Automatically fly to highlighted thought when explicitly selected or posted
  useEffect(() => {
    if (!mapRef.current || !highlightedThoughtId) return;
    const targetThought = thoughts.find((t) => t.id === highlightedThoughtId);
    if (targetThought?.location?.coordinates) {
      mapRef.current.flyTo({
        center: [targetThought.location.coordinates.lng, targetThought.location.coordinates.lat],
        zoom: 13,
        duration: 1400,
        essential: true,
      });
    }
  }, [highlightedThoughtId]);

  // Fly to selected location or user's exact GPS coordinates
  useEffect(() => {
    if (mapRef.current && selectedLocation && !highlightedThoughtId) {
      mapRef.current.flyTo({
        center: [selectedLocation.coordinates.lng, selectedLocation.coordinates.lat],
        zoom: 12,
        duration: 1200,
      });
    }
  }, [selectedLocation, highlightedThoughtId, mapLoaded]);

  const handleResetToPhilippinesView = () => {
    setSelectedThoughtPreview(null);
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: PHILIPPINES_MAP_OPTIONS.center,
      zoom: PHILIPPINES_MAP_OPTIONS.zoom,
      duration: 1200,
    });
  };

  const handleLocateMe = () => {
    setSelectedThoughtPreview(null);
    if (userGpsCoords && mapRef.current) {
      mapRef.current.flyTo({
        center: [userGpsCoords.lng, userGpsCoords.lat],
        zoom: 14,
        duration: 1200,
        essential: true,
      });
    }
    onRequestGeoLocation?.();
  };

  return (
    <div
      className={
        isFullScreen
          ? 'fixed inset-0 z-50 w-full h-[100dvh] bg-slate-950 flex flex-col overflow-hidden animate-fadeIn'
          : 'relative w-full h-[360px] sm:h-[430px] rounded-3xl overflow-hidden border border-slate-800/80 shadow-2xl bg-slate-950 transition-all'
      }
    >
      {/* Map Canvas */}
      <div
        ref={mapContainerRef}
        className="w-full h-full absolute inset-0"
        style={{ touchAction: isFullScreen ? 'none' : 'pan-y' }}
      />

      {/* Top Floating Controls Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-none">
        
        {/* Top Left: Exit Fullscreen / Back to Feed OR Badge */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {isFullScreen ? (
            <button
              onClick={toggleFullScreen}
              title="Return to Notes Feed"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-950/90 hover:bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-100 shadow-xl backdrop-blur-md transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 text-sky-400" />
              <span>Back to Feed</span>
            </button>
          ) : null}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-800 text-[11px] font-semibold text-slate-200 shadow-lg">
            <Shield className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span className="hidden xs:inline">Live Notes Map</span>
            <span className="text-teal-300">({thoughts.length} {thoughts.length === 1 ? 'Note' : 'Notes'})</span>
          </div>
        </div>

        {/* Top Right: Philippines Full View Reset & Fullscreen Toggle */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={handleResetToPhilippinesView}
            title="View all notes across the Philippines"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-slate-950/85 hover:bg-slate-900 backdrop-blur-md border border-slate-800 text-[11px] font-semibold text-sky-300 transition-all shadow-md active:scale-95"
          >
            <PhilippineFlag className="w-4 h-2.5" />
            <span>All PH</span>
          </button>

          <button
            onClick={toggleFullScreen}
            title={isFullScreen ? 'Exit Full Screen' : 'Full Screen Map View for Mobile & Desktop'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 backdrop-blur-md text-xs font-bold transition-all shadow-lg active:scale-95"
          >
            {isFullScreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Full Map</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Selected Note Preview Bottom Sheet (Particularly touch-friendly on mobile!) */}
      {selectedThoughtPreview && (
        <div className="absolute bottom-16 sm:bottom-4 left-3 right-3 sm:left-4 sm:right-auto sm:max-w-md z-30 p-3.5 rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-teal-500/40 shadow-2xl space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold text-teal-300 truncate">
                {selectedThoughtPreview.authorAlias.displayName}
              </span>
              <span className="px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-300 text-[9px] font-semibold shrink-0">
                {selectedThoughtPreview.category}
              </span>
              {selectedThoughtPreview.isEnvironmentalAlert && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-bold shrink-0">
                  Eco Alert
                </span>
              )}
            </div>
            <button
              onClick={() => setSelectedThoughtPreview(null)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-slate-100 line-clamp-3 leading-relaxed">
            "{selectedThoughtPreview.body}"
          </p>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] text-slate-400">
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
              <span className="truncate">{selectedThoughtPreview.location.cityMunicipality}</span>
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span>❤️ {selectedThoughtPreview.reactions.heart}</span>
              <button
                onClick={() => {
                  onSelectThought?.(selectedThoughtPreview);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all shadow active:scale-95"
              >
                <MessageSquare className="w-3 h-3" />
                <span>Read & Reply ({selectedThoughtPreview.commentCount})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Floating Action Bar */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2">
        {onOpenCreateModal && isFullScreen && (
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-white text-xs font-bold shadow-xl shadow-teal-500/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Drop Note Here</span>
          </button>
        )}

        {onRequestGeoLocation && (
          <button
            onClick={handleLocateMe}
            disabled={isLocating}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-lg shadow-sky-500/30 transition-all disabled:opacity-50 active:scale-95"
          >
            <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Locating...' : 'My Location'}</span>
          </button>
        )}
      </div>

      {/* Bottom Left: Map Helper Note (hidden in fullscreen or mobile) */}
      {!isFullScreen && (
        <div className="absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-2">
          <div className="px-3 py-1 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-800 text-[10px] text-slate-300">
            🍭 Tap any lollipop note on the map to read or reply
          </div>
        </div>
      )}
    </div>
  );
};
