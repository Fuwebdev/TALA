import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  UserCheck,
  Dices,
  ShieldCheck,
  MessageSquare,
  MapPin,
  Heart,
  CheckCircle2,
  Navigation,
  Loader2,
  Search,
  Globe,
  UserX,
  Edit3,
  Trash2,
} from 'lucide-react';
import { Alias, createAnonymousAlias, validateUsername } from '../../domain/entities/Alias';
import { Thought } from '../../domain/entities/Thought';
import { Location, formatLocationName } from '../../domain/entities/Location';
import { GeolocationService } from '../../application/services/GeolocationService';
import { PHILIPPINE_LOCATIONS } from '../../infrastructure/repositories/MockLocationRepository';

interface UserSettingsModalProps {
  isOpen: boolean;
  isFirstTimeOnboarding?: boolean;
  onClose: () => void;
  currentAlias: Alias;
  userNotes: Thought[];
  blockedUserIds?: string[];
  onSaveUsername: (updatedAlias: Alias) => void;
  onRequestLocation: () => Promise<Location | null>;
  onRequestIpLocation?: () => Promise<Location | null>;
  onSelectManualLocation?: (location: Location) => Promise<Location>;
  availableLocations?: Location[];
  lastLocationError?: string | null;
  isLocating?: boolean;
  detectedLocation?: Location | null;
  hasGpsCoords?: boolean;
  onSelectNote?: (thought: Thought) => void;
  onEditNote?: (thought: Thought) => void;
  onDeleteNote?: (thoughtId: string) => void;
  onUnblockUser?: (aliasId: string) => void;
}


export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  isOpen,
  isFirstTimeOnboarding = false,
  onClose,
  currentAlias,
  userNotes,
  blockedUserIds = [],
  onSaveUsername,
  onRequestLocation,
  onRequestIpLocation,
  onSelectManualLocation,
  availableLocations = [],
  lastLocationError = null,
  isLocating = false,
  detectedLocation = null,
  hasGpsCoords = false,
  onSelectNote,
  onEditNote,
  onDeleteNote,
  onUnblockUser,
}) => {
  const [usernameInput, setUsernameInput] = useState(currentAlias.displayName);
  const [activeTab, setActiveTab] = useState<'profile' | 'mynotes' | 'blocked'>('profile');
  const [onboardingStep, setOnboardingStep] = useState<'username' | 'location'>('username');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Manual / Search fallback state for users whose browser blocks or cannot detect GPS
  const [showManualPicker, setShowManualPicker] = useState(false);
  const [placeSearchQuery, setPlaceSearchQuery] = useState('');
  const [placeSearchResults, setPlaceSearchResults] = useState<Location[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [isSelectingManual, setIsSelectingManual] = useState(false);

  useEffect(() => {
    setUsernameInput(currentAlias.displayName);
  }, [currentAlias]);

  useEffect(() => {
    if (isOpen && isFirstTimeOnboarding) {
      setOnboardingStep('username');
    }
  }, [isOpen, isFirstTimeOnboarding]);

  // Debounced Philippine barangay/city search when user types in manual fallback
  useEffect(() => {
    const q = placeSearchQuery.trim();
    if (q.length < 2) {
      setPlaceSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingPlaces(true);
      try {
        const remote = await GeolocationService.searchPhilippinePlaces(q);
        setPlaceSearchResults(remote);
      } catch {
        setPlaceSearchResults([]);
      } finally {
        setIsSearchingPlaces(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [placeSearchQuery]);

  if (!isOpen) return null;

  const presetCities = availableLocations.length > 1 ? availableLocations : PHILIPPINE_LOCATIONS;
  const filteredPresetCities = placeSearchQuery.trim()
    ? presetCities.filter(
        (l) =>
          l.cityMunicipality.toLowerCase().includes(placeSearchQuery.toLowerCase()) ||
          l.province.toLowerCase().includes(placeSearchQuery.toLowerCase())
      )
    : presetCities;

  const combinedManualOptions = [
    ...placeSearchResults,
    ...filteredPresetCities.filter(
      (preset) =>
        !placeSearchResults.some(
          (r) => r.cityMunicipality.toLowerCase() === preset.cityMunicipality.toLowerCase()
        )
    ),
  ].slice(0, 12);

  const handleRandomize = () => {
    const generated = createAnonymousAlias();
    setUsernameInput(generated.displayName);
    setValidationError(null);
  };

  const handleTriggerLocation = async () => {
    setLocationError(null);
    try {
      const loc = await onRequestLocation();
      if (loc) {
        if (isFirstTimeOnboarding) {
          setTimeout(() => {
            onClose();
          }, 1100);
        }
      } else {
        setShowManualPicker(true);
        setLocationError(
          lastLocationError ||
            'Could not detect browser GPS. You can click "Use Network Location" or pick your city/barangay below.'
        );
      }
    } catch (err: any) {
      setShowManualPicker(true);
      setLocationError(
        err?.message ||
          'Unable to access browser GPS. You can use Network Location or select your city/barangay below.'
      );
    }
  };

  const handleTriggerIpLocation = async () => {
    if (!onRequestIpLocation) return;
    setLocationError(null);
    try {
      const loc = await onRequestIpLocation();
      if (loc) {
        if (isFirstTimeOnboarding) {
          setTimeout(() => {
            onClose();
          }, 1100);
        }
      } else {
        setShowManualPicker(true);
        setLocationError('Could not detect network location. Please select your city or barangay from the list below.');
      }
    } catch (err: any) {
      setShowManualPicker(true);
      setLocationError(err?.message || 'Please select your city or barangay from the list below.');
    }
  };

  const handlePickManualLocation = async (loc: Location) => {
    if (!onSelectManualLocation) return;
    setIsSelectingManual(true);
    setLocationError(null);
    try {
      await onSelectManualLocation(loc);
      setShowManualPicker(false);
      if (isFirstTimeOnboarding) {
        setTimeout(() => {
          onClose();
        }, 900);
      }
    } catch (err: any) {
      setLocationError(err?.message || 'Failed to set location.');
    } finally {
      setIsSelectingManual(false);
    }
  };

  const handleSubmitUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateUsername(usernameInput);
    if (!check.valid) {
      setValidationError(check.error || 'Invalid username.');
      return;
    }

    const updatedAlias: Alias = {
      ...currentAlias,
      displayName: usernameInput.trim(),
      avatarSeed: usernameInput.trim(),
    };

    onSaveUsername(updatedAlias);
    setValidationError(null);
    setSavedSuccess(true);

    if (isFirstTimeOnboarding) {
      // Move immediately to Step 2 (Ask to allow location) and trigger browser GPS prompt
      setOnboardingStep('location');
      setSavedSuccess(false);
      await handleTriggerLocation();
    } else {
      setTimeout(() => {
        setSavedSuccess(false);
      }, 1200);
    }
  };

  const renderManualLocationFallback = () => (
    <div className="pt-2 border-t border-slate-800/80 text-left space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-teal-400" />
          Can't allow browser GPS? Pick or search your area:
        </span>
        {onRequestIpLocation && (
          <button
            type="button"
            onClick={handleTriggerIpLocation}
            disabled={isLocating || isSelectingManual}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 text-[10px] font-semibold transition-all disabled:opacity-50 shrink-0"
          >
            <Globe className="w-3 h-3" />
            <span>Detect via Network</span>
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={placeSearchQuery}
          onChange={(e) => setPlaceSearchQuery(e.target.value)}
          placeholder="Search any PH barangay, city, or municipality..."
          className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/60"
        />
      </div>

      {isSearchingPlaces && (
        <p className="text-[10px] text-sky-400 animate-pulse">Searching Philippine locations...</p>
      )}

      <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
        {combinedManualOptions.map((loc) => (
          <button
            key={`${loc.id}-${loc.cityMunicipality}`}
            type="button"
            disabled={isSelectingManual}
            onClick={() => handlePickManualLocation(loc)}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-sky-500/15 border border-slate-800/80 hover:border-sky-500/30 text-left text-xs transition-all"
          >
            <div>
              <span className="font-semibold text-slate-200 block">{loc.cityMunicipality}</span>
              <span className="text-[10px] text-slate-400">
                {loc.province} • {loc.region}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-sky-400 shrink-0">Select →</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-sky-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              {isFirstTimeOnboarding && onboardingStep === 'location' ? (
                <Navigation className="w-4 h-4" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                {isFirstTimeOnboarding
                  ? onboardingStep === 'username'
                    ? 'Step 1 of 2: Choose Your Username'
                    : 'Step 2 of 2: Set Your Location'
                  : 'User Settings & My Notes'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {isFirstTimeOnboarding
                  ? onboardingStep === 'username'
                    ? 'Set your anonymous username to start leaving notes'
                    : 'Allow GPS or pick your city/barangay so notes appear where you are'
                  : 'Cached locally on your device • No personal info required'}
              </p>
            </div>
          </div>

          {!isFirstTimeOnboarding && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Step Indicator for First-Time Onboarding */}
        {isFirstTimeOnboarding && (
          <div className="flex items-center gap-2 shrink-0">
            <div
              className={`h-1.5 flex-1 rounded-full transition-all ${
                onboardingStep === 'username' ? 'bg-sky-500' : 'bg-teal-500'
              }`}
            />
            <div
              className={`h-1.5 flex-1 rounded-full transition-all ${
                onboardingStep === 'location' ? 'bg-sky-500' : 'bg-slate-800'
              }`}
            />
          </div>
        )}

        {/* Navigation Tabs (Hidden during first-time onboarding) */}
        {!isFirstTimeOnboarding && (
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'profile'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Username & Location</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('mynotes')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'mynotes'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>My Notes ({userNotes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('blocked')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'blocked'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserX className="w-3.5 h-3.5" />
              <span>Blocked ({blockedUserIds.length})</span>
            </button>
          </div>
        )}


        {/* FIRST-TIME ONBOARDING STEP 2: ALLOW OR PICK LOCATION */}
        {isFirstTimeOnboarding && onboardingStep === 'location' && (
          <div className="space-y-4 overflow-y-auto pr-1">
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 text-center space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center mx-auto text-sky-400">
                {isLocating || isSelectingManual ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : hasGpsCoords ? (
                  <CheckCircle2 className="w-5 h-5 text-teal-400" />
                ) : (
                  <Navigation className="w-5 h-5" />
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-white">
                  Hi <span className="text-teal-400">{currentAlias.displayName}</span>! Where are you right now?
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Click <strong className="text-slate-200">"Allow"</strong> on your browser prompt, or if your browser blocks location prompts, search or select your city/barangay below.
                </p>
              </div>

              {hasGpsCoords && detectedLocation && (
                <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>
                    Location Locked: {detectedLocation.cityMunicipality}, {detectedLocation.province}
                  </span>
                </div>
              )}

              {(locationError || lastLocationError) && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] text-left leading-relaxed">
                  {locationError || lastLocationError}
                </div>
              )}

              <div className="pt-1 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleTriggerLocation}
                  disabled={isLocating || isSelectingManual}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-white text-xs font-semibold shadow-md shadow-sky-500/20 disabled:opacity-50 transition-all"
                >
                  <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>
                    {isLocating
                      ? 'Detecting Location...'
                      : hasGpsCoords
                      ? 'Refresh GPS'
                      : 'Allow Browser GPS'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowManualPicker((prev) => !prev)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/20 text-xs font-semibold transition-colors"
                >
                  {showManualPicker ? 'Hide Manual Search' : 'Search / Pick Manually'}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  {hasGpsCoords ? 'Continue to Map' : 'Skip for Now'}
                </button>
              </div>

              {(showManualPicker || Boolean(locationError || lastLocationError)) && renderManualLocationFallback()}
            </div>
          </div>
        )}

        {/* USERNAME SETUP & VALIDATION (Onboarding Step 1 OR Regular Settings Tab 1) */}
        {((!isFirstTimeOnboarding && activeTab === 'profile') ||
          (isFirstTimeOnboarding && onboardingStep === 'username')) && (
          <form onSubmit={handleSubmitUsername} className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Your Anonymous Username
                </label>
                <button
                  type="button"
                  onClick={handleRandomize}
                  className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-semibold"
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>Generate Random</span>
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center font-bold text-sky-400 text-sm border border-slate-700 shrink-0">
                  {usernameInput.trim().charAt(0).toUpperCase() || '?'}
                </div>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => {
                    setUsernameInput(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder="e.g. MidnightThinker_482"
                  maxLength={28}
                  className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/60"
                />
              </div>

              <p className="text-[10px] text-slate-400 leading-relaxed flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>3–28 characters (letters, numbers, underscores). Cached on this device so you keep your notes.</span>
              </p>

              {validationError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                  {validationError}
                </div>
              )}

              {savedSuccess && (
                <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Username validated and cached!</span>
                </div>
              )}
            </div>

            {/* In regular Settings mode, also show Location permission status & button */}
            {!isFirstTimeOnboarding && (
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-sky-400" />
                      <span>Your Exact Location</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      {hasGpsCoords && detectedLocation
                        ? `${detectedLocation.cityMunicipality}, ${detectedLocation.province}`
                        : 'Location not yet locked via GPS'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowManualPicker((prev) => !prev)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/20 text-xs font-semibold transition-colors"
                    >
                      {showManualPicker ? 'Hide Search' : 'Pick City/Barangay'}
                    </button>
                    <button
                      type="button"
                      onClick={handleTriggerLocation}
                      disabled={isLocating || isSelectingManual}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-semibold transition-all shrink-0"
                    >
                      <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                      <span>{isLocating ? 'Locating...' : hasGpsCoords ? 'Update GPS' : 'Allow GPS'}</span>
                    </button>
                  </div>
                </div>

                {(locationError || lastLocationError) && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
                    {locationError || lastLocationError}
                  </div>
                )}

                {showManualPicker && renderManualLocationFallback()}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              {!isFirstTimeOnboarding && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Close
                </button>
              )}
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition-all"
              >
                {isFirstTimeOnboarding ? 'Next: Allow My Location' : 'Save Username'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: View User's Notes */}
        {activeTab === 'mynotes' && !isFirstTimeOnboarding && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[55vh]">
            {userNotes.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-300">You haven't left any notes yet</p>
                <p className="text-[11px] text-slate-500">
                  Notes you post under <strong className="text-teal-400">{currentAlias.displayName}</strong> will appear here.
                </p>
              </div>
            ) : (
              userNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 hover:border-sky-500/40 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span
                      onClick={() => {
                        onSelectNote?.(note);
                        onClose();
                      }}
                      className="flex items-center gap-1 text-sky-400 font-semibold cursor-pointer hover:underline"
                    >
                      <MapPin className="w-3 h-3" />
                      {formatLocationName(note.location)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px]">
                        {note.category}
                      </span>
                      {onEditNote && (
                        <button
                          type="button"
                          onClick={() => {
                            onEditNote(note);
                            onClose();
                          }}
                          className="p-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 transition-colors"
                          title="Edit note"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      )}
                      {onDeleteNote && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this note?')) {
                              onDeleteNote(note.id);
                            }
                          }}
                          className="p-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 transition-colors"
                          title="Delete note"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p
                    onClick={() => {
                      onSelectNote?.(note);
                      onClose();
                    }}
                    className="text-xs text-slate-200 leading-relaxed break-words cursor-pointer"
                  >
                    "{note.body}"
                  </p>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3 text-rose-500" /> {note.reactions.heart}
                    </span>
                    <span>💬 {note.commentCount} replies</span>
                    <span className="ml-auto">
                      {new Date(note.createdAtISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Blocked Users Management */}
        {activeTab === 'blocked' && !isFirstTimeOnboarding && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[55vh]">
            {blockedUserIds.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                <UserX className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-300">No blocked users</p>
                <p className="text-[11px] text-slate-500">
                  When you block someone from a note or comment, they will appear here and their posts will be hidden from your feed and map.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-400">
                  Notes and comments from these authors are completely hidden from your feed:
                </p>
                {blockedUserIds.map((aliasId) => (
                  <div
                    key={aliasId}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/90 border border-slate-800"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-slate-400 text-xs">
                        <UserX className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <span className="text-xs font-bold text-slate-200">
                        {aliasId}
                      </span>
                    </div>
                    {onUnblockUser && (
                      <button
                        type="button"
                        onClick={() => onUnblockUser(aliasId)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 text-xs font-semibold border border-slate-700 transition-colors"
                      >
                        Unblock
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


      </div>
    </div>
  );
};
