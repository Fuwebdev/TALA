import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, MapPin, AlertTriangle, ShieldCheck, Navigation, CheckCircle2, Search, Globe } from 'lucide-react';
import { Alias } from '../../domain/entities/Alias';
import { Location } from '../../domain/entities/Location';
import { Category } from '../../domain/entities/Thought';
import { GeolocationService } from '../../application/services/GeolocationService';
import { PHILIPPINE_LOCATIONS } from '../../infrastructure/repositories/MockLocationRepository';
import { ModerationService } from '../../application/services/ModerationService';
import { DeviceBanService } from '../../application/services/DeviceBanService';
import { useToast } from './Toast';

interface CreateThoughtModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAlias: Alias;
  locations: Location[];
  selectedLocation: Location | null;
  userGpsCoords?: { lat: number; lng: number } | null;
  nearbyLocations?: Location[];
  onExactLocationDetected?: (
    location: Location,
    coords: { lat: number; lng: number },
    nearby5km?: Location[]
  ) => Promise<Location>;
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
  userGpsCoords,
  nearbyLocations = [],
  onExactLocationDetected,
  onSubmit,
}) => {
  const { showToast } = useToast();
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<Category>('Thoughts');
  const [location, setLocation] = useState<Location | null>(initialLocation || null);
  const [localNearby5km, setLocalNearby5km] = useState<Location[]>(nearbyLocations);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [isEnvironmentalAlert, setIsEnvironmentalAlert] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  // Manual place search fallback if user's browser blocks GPS
  const [showPlaceSearch, setShowPlaceSearch] = useState(false);
  const [placeQuery, setPlaceQuery] = useState('');
  const [searchedPlaces, setSearchedPlaces] = useState<Location[]>([]);
  const [searchingPlace, setSearchingPlace] = useState(false);

  // Base reference coordinates (user's exact GPS or initial selected location)
  const anchorCoords = useMemo(() => {
    if (location?.coordinates) return location.coordinates;
    if (userGpsCoords) return userGpsCoords;
    if (initialLocation?.coordinates) return initialLocation.coordinates;
    return null;
  }, [userGpsCoords, initialLocation, location]);

  useEffect(() => {
    if (initialLocation) {
      setLocation(initialLocation);
    }
  }, [initialLocation]);

  useEffect(() => {
    if (nearbyLocations.length > 0) {
      setLocalNearby5km(nearbyLocations);
    }
  }, [nearbyLocations]);

  // Debounced search for Philippine barangays/cities
  useEffect(() => {
    const q = placeQuery.trim();
    if (q.length < 2) {
      setSearchedPlaces([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingPlace(true);
      try {
        const res = await GeolocationService.searchPhilippinePlaces(q);
        setSearchedPlaces(res);
      } catch {
        setSearchedPlaces([]);
      } finally {
        setSearchingPlace(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [placeQuery]);

  // Automatically fetch 5km nearby addresses when modal opens if not yet populated
  useEffect(() => {
    if (!isOpen) return;
    const baseLoc = initialLocation || location;
    if (!baseLoc || !baseLoc.coordinates) return;

    if (localNearby5km.length === 0) {
      setLoadingNearby(true);
      GeolocationService.getNearbyLocationsWithin5km(
        baseLoc.coordinates.lat,
        baseLoc.coordinates.lng,
        baseLoc
      )
        .then((nearby) => {
          setLocalNearby5km(nearby);
        })
        .catch(() => {})
        .finally(() => {
          setLoadingNearby(false);
        });
    }
  }, [isOpen, initialLocation]);

  // Build dropdown list with Current Location + Nearby Locations within 5km radius
  const nearbyDropdownOptions = useMemo(() => {
    const baseLoc = location || initialLocation;
    if (!baseLoc || !anchorCoords) {
      return PHILIPPINE_LOCATIONS.map((loc, idx) => ({
        loc,
        distKm: 0,
        isCurrent: idx === 0,
      }));
    }

    const optionsMap = new Map<string, { loc: Location; distKm: number; isCurrent: boolean }>();

    // 1. Always put Current/Selected Location first (0.0 km)
    optionsMap.set(baseLoc.cityMunicipality.toLowerCase().trim(), {
      loc: baseLoc,
      distKm: 0,
      isCurrent: true,
    });

    // 2. Add fetched nearby addresses within 5km radius
    const candidates = [...localNearby5km, ...locations];
    for (const item of candidates) {
      if (!item?.coordinates) continue;
      const distKm = GeolocationService.calculateDistanceKm(
        anchorCoords.lat,
        anchorCoords.lng,
        item.coordinates.lat,
        item.coordinates.lng
      );

      if (distKm <= 5.0) {
        const key = item.cityMunicipality.toLowerCase().trim();
        if (!optionsMap.has(key)) {
          optionsMap.set(key, {
            loc: item,
            distKm,
            isCurrent: false,
          });
        }
      }
    }

    return Array.from(optionsMap.values()).sort((a, b) => {
      if (a.isCurrent) return -1;
      if (b.isCurrent) return 1;
      return a.distKm - b.distKm;
    });
  }, [initialLocation, location, localNearby5km, locations, anchorCoords]);

  if (!isOpen) return null;

  const handleUseMyCurrentLocation = async () => {
    setDetectingGps(true);
    setError(null);
    setGpsStatus(null);
    try {
      const result = await GeolocationService.detectUserLocation();
      let persistedLoc = result.exactLocation;
      if (onExactLocationDetected) {
        persistedLoc = await onExactLocationDetected(
          result.exactLocation,
          result.coords,
          result.nearbyLocations
        );
      }
      setLocation(persistedLoc);
      setLocalNearby5km(result.nearbyLocations);
      setShowPlaceSearch(false);
      setGpsStatus(
        `Current location & ${result.nearbyLocations.length} nearby addresses (within 5km) loaded`
      );
    } catch (err: any) {
      setShowPlaceSearch(true);
      setError(
        err.message ||
          'Browser GPS unavailable. You can search or pick your barangay/city below.'
      );
    } finally {
      setDetectingGps(false);
    }
  };

  const handleUseNetworkLocation = async () => {
    setDetectingGps(true);
    setError(null);
    setGpsStatus(null);
    try {
      const result = await GeolocationService.detectApproxLocationByIp();
      let persistedLoc = result.exactLocation;
      if (onExactLocationDetected) {
        persistedLoc = await onExactLocationDetected(
          result.exactLocation,
          result.coords,
          result.nearbyLocations
        );
      }
      setLocation(persistedLoc);
      setLocalNearby5km(result.nearbyLocations);
      setShowPlaceSearch(false);
      setGpsStatus(
        `Network location & ${result.nearbyLocations.length} nearby addresses (within 5km) loaded`
      );
    } catch (err: any) {
      setShowPlaceSearch(true);
      setError(err.message || 'Please search or select your city/barangay below.');
    } finally {
      setDetectingGps(false);
    }
  };

  const handleSelectManualPlace = async (picked: Location) => {
    setLoadingNearby(true);
    setError(null);
    try {
      const nearby = await GeolocationService.getNearbyLocationsWithin5km(
        picked.coordinates.lat,
        picked.coordinates.lng,
        picked
      );
      let persistedLoc = picked;
      if (onExactLocationDetected) {
        persistedLoc = await onExactLocationDetected(picked, picked.coordinates, nearby);
      }
      setLocation(persistedLoc);
      setLocalNearby5km(nearby);
      setShowPlaceSearch(false);
      setPlaceQuery('');
      setGpsStatus(
        `Selected ${persistedLoc.cityMunicipality} (+${nearby.length} nearby within 5km)`
      );
    } catch {
      setLocation(picked);
      setShowPlaceSearch(false);
    } finally {
      setLoadingNearby(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) {
      setError('Please write a note before publishing.');
      return;
    }
    const targetLocation = location || nearbyDropdownOptions[0]?.loc;
    if (!targetLocation) {
      setError('Please select your current or nearby location above.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Multilingual AI + Local Profanity & Content Moderation Pipeline
      const modResult = await ModerationService.evaluateText(body);
      if (!modResult.allowed) {
        setError(
          modResult.message ||
            'Your message contains inappropriate language. Please remove offensive words and try again.'
        );
        try {
          const violation = await DeviceBanService.recordViolation(
            modResult.reason || 'Profanity or abusive content in note',
            body.trim(),
            currentAlias.id,
            currentAlias.displayName
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

  const manualCandidates = [
    ...searchedPlaces,
    ...PHILIPPINE_LOCATIONS.filter((p) =>
      placeQuery.trim()
        ? p.cityMunicipality.toLowerCase().includes(placeQuery.toLowerCase()) ||
          p.province.toLowerCase().includes(placeQuery.toLowerCase())
        : true
    ).filter(
      (p) =>
        !searchedPlaces.some(
          (s) => s.cityMunicipality.toLowerCase() === p.cityMunicipality.toLowerCase()
        )
    ),
  ].slice(0, 10);

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
              <p className="text-[10px] sm:text-[11px] text-slate-400">
                Posting as <strong className="text-teal-400">{currentAlias?.displayName || 'Anonymous'}</strong> • Replaces previous note • Expires in 24h
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
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
          
          {/* Step 1: Current Location & Nearby 5km Radius Dropdown */}
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-sky-400" />
                  Where are you right now?
                </label>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Showing your current location & nearby addresses within 5km radius
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowPlaceSearch((prev) => !prev)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-semibold transition-all"
                >
                  <Search className="w-3 h-3 text-teal-400" />
                  <span>{showPlaceSearch ? 'Hide Search' : 'Search Place'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleUseMyCurrentLocation}
                  disabled={detectingGps}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-[11px] font-semibold transition-all disabled:opacity-50 shrink-0"
                >
                  <Navigation className={`w-3 h-3 text-sky-400 ${detectingGps ? 'animate-spin' : ''}`} />
                  <span>{detectingGps ? 'Detecting...' : 'Refresh GPS'}</span>
                </button>
              </div>
            </div>

            {gpsStatus && (
              <div className="flex items-center gap-1.5 text-[11px] text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2.5 py-1.5 rounded-xl">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{gpsStatus}</span>
              </div>
            )}

            {showPlaceSearch && (
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold text-slate-300">
                    Can't allow GPS? Search any PH barangay or city:
                  </span>
                  <button
                    type="button"
                    onClick={handleUseNetworkLocation}
                    disabled={detectingGps}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 text-[10px] font-semibold"
                  >
                    <Globe className="w-3 h-3" />
                    <span>Detect via Network</span>
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={placeQuery}
                    onChange={(e) => setPlaceQuery(e.target.value)}
                    placeholder="Type barangay, city, or municipality..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                  />
                </div>

                {searchingPlace && (
                  <p className="text-[10px] text-sky-400 animate-pulse">Searching Philippine locations...</p>
                )}

                <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                  {manualCandidates.map((item) => (
                    <button
                      key={`${item.id}-${item.cityMunicipality}`}
                      type="button"
                      onClick={() => handleSelectManualPlace(item)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950/80 hover:bg-sky-500/15 border border-slate-800/80 text-left text-xs transition-all"
                    >
                      <div>
                        <span className="font-medium text-slate-200 block">{item.cityMunicipality}</span>
                        <span className="text-[10px] text-slate-400">{item.province}</span>
                      </div>
                      <span className="text-[10px] text-sky-400 font-semibold">Use →</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="relative">
              <select
                value={location?.id || nearbyDropdownOptions[0]?.loc.id || ''}
                onChange={(e) => {
                  const found = nearbyDropdownOptions.find((entry) => entry.loc.id === e.target.value);
                  if (found) {
                    setLocation(found.loc);
                    setGpsStatus(null);
                  }
                }}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-sky-500/50"
              >
                {nearbyDropdownOptions.length === 0 ? (
                  <option value="">Click "Refresh GPS" or "Search Place" above...</option>
                ) : (
                  nearbyDropdownOptions.map(({ loc, distKm, isCurrent }) => (
                    <option key={loc.id} value={loc.id}>
                      {isCurrent
                        ? `📍 [Selected Area] ${loc.cityMunicipality}, ${loc.province}`
                        : `🧭 [${distKm.toFixed(1)} km away] ${loc.cityMunicipality}, ${loc.province}`}
                    </option>
                  ))
                )}
              </select>

              {loadingNearby && (
                <p className="text-[10px] text-sky-400 mt-1 animate-pulse">
                  Scanning nearby addresses within 5km radius...
                </p>
              )}
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
              onChange={(e) => {
                setBody(e.target.value);
                setError(null);
              }}
              placeholder="Write a note about what's happening where you are..."
              maxLength={500}
              className={`w-full p-3.5 bg-slate-950 border rounded-2xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none resize-none leading-relaxed transition-colors ${
                error
                  ? 'border-rose-500 focus:border-rose-400'
                  : 'border-slate-800 focus:border-sky-500/50'
              }`}
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
