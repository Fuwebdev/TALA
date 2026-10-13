import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, MapPin, AlertTriangle, ShieldCheck, Navigation, CheckCircle2 } from 'lucide-react';
import { Alias } from '../../domain/entities/Alias';
import { Location } from '../../domain/entities/Location';
import { Category } from '../../domain/entities/Thought';
import { GeolocationService } from '../../application/services/GeolocationService';

interface CreateThoughtModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAlias: Alias;
  locations: Location[];
  selectedLocation: Location | null;
  onExactLocationDetected?: (location: Location, coords: { lat: number; lng: number }) => Promise<Location>;
  onSubmit: (params: {
    body: string;
    category: Category;
    location: Location;
    isEnvironmentalAlert: boolean;
  }) => Promise<void>;
}

export const CreateThoughtModal: React.FC<CreateThoughtModalProps> = ({
  isOpen,
  onClose,
  currentAlias,
  locations,
  selectedLocation: initialLocation,
  onExactLocationDetected,
  onSubmit,
}) => {
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<Category>('Thoughts');
  const [location, setLocation] = useState<Location | null>(initialLocation || null);
  const [isEnvironmentalAlert, setIsEnvironmentalAlert] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  useEffect(() => {
    if (initialLocation) {
      setLocation(initialLocation);
    } else if (locations.length > 0 && !location) {
      setLocation(locations[0]);
    }
  }, [initialLocation, locations]);

  // Ensure the active exact location is always in the dropdown options (Must be called BEFORE early return)
  const dropdownLocations = useMemo(() => {
    if (!location) return locations;
    const exists = locations.some(l => l.id === location.id);
    return exists ? locations : [location, ...locations];
  }, [locations, location]);

  if (!isOpen) return null;

  const handleUseMyCurrentLocation = async () => {
    setDetectingGps(true);
    setError(null);
    setGpsStatus(null);
    try {
      const result = await GeolocationService.detectUserLocation();
      let persistedLoc = result.exactLocation;
      if (onExactLocationDetected) {
        persistedLoc = await onExactLocationDetected(result.exactLocation, result.coords);
      }
      setLocation(persistedLoc);
      setGpsStatus(`Exact location detected: ${persistedLoc.cityMunicipality}, ${persistedLoc.province}`);
    } catch (err: any) {
      setError(err.message || 'Unable to detect your exact location.');
    } finally {
      setDetectingGps(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) {
      setError('Please write a note before publishing.');
      return;
    }
    const targetLocation = location || locations[0];
    if (!targetLocation) {
      setError('Please allow your location or select a location.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit({
        body,
        category,
        location: targetLocation,
        isEnvironmentalAlert,
      });
      setBody('');
      setGpsStatus(null);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to publish note.');
    } finally {
      setSubmitting(false);
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
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Leave a Note Where You Are</h2>
              <p className="text-[10px] sm:text-[11px] text-slate-400">Posting anonymously as <strong className="text-teal-400">{currentAlias?.displayName || 'Anonymous'}</strong></p>
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
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
          
          {/* Step 1: Allow Location or Choose City */}
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                Where are you right now?
              </label>

              <button
                type="button"
                onClick={handleUseMyCurrentLocation}
                disabled={detectingGps}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-[11px] font-semibold transition-all disabled:opacity-50"
              >
                <Navigation className={`w-3 h-3 text-sky-400 ${detectingGps ? 'animate-spin' : ''}`} />
                <span>{detectingGps ? 'Detecting Exact Location...' : 'Allow My Location'}</span>
              </button>
            </div>

            {gpsStatus && (
              <div className="flex items-center gap-1.5 text-[11px] text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2.5 py-1.5 rounded-xl">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{gpsStatus}</span>
              </div>
            )}

            <div className="relative">
              <select
                value={location?.id || ''}
                onChange={(e) => {
                  const found = dropdownLocations.find(l => l.id === e.target.value);
                  if (found) {
                    setLocation(found);
                    setGpsStatus(null);
                  }
                }}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-sky-500/50"
              >
                {dropdownLocations.length === 0 ? (
                  <option value="">Click "Allow My Location" to detect where you are...</option>
                ) : (
                  dropdownLocations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      📍 {loc.cityMunicipality}, {loc.province} ({loc.region})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Step 2: Category Chips */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Note Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                    category === cat
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Note Textarea */}
          <div>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write a note about what's happening where you are..."
              maxLength={500}
              className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500/50 resize-none leading-relaxed"
            />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] text-slate-500 gap-1 mt-1">
              <span className="flex items-center gap-1 text-teal-400 font-medium">
                <ShieldCheck className="w-3 h-3 shrink-0" />
                Posted anonymously using your public alias
              </span>
              <span>{body.length}/500</span>
            </div>
          </div>

          {/* Environmental Checkbox */}
          <label className="flex items-start sm:items-center gap-2.5 p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 cursor-pointer">
            <input
              type="checkbox"
              checked={isEnvironmentalAlert}
              onChange={(e) => setIsEnvironmentalAlert(e.target.checked)}
              className="w-4 h-4 accent-amber-500 rounded mt-0.5 sm:mt-0 shrink-0"
            />
            <div className="text-xs">
              <span className="font-semibold text-amber-300 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                Mark as Local Weather / Environmental Alert
              </span>
              <p className="text-[10px] text-slate-400">Highlight flood observations, heavy rain, waste, or community safety</p>
            </div>
          </label>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-white text-xs font-semibold hover:from-sky-400 hover:to-teal-400 shadow-md shadow-sky-500/20 disabled:opacity-50"
            >
              {submitting ? 'Dropping Note...' : 'Leave Note Here'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
