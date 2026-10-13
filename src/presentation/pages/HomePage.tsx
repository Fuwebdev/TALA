import React, { useEffect, useState, useMemo } from 'react';
import { Header } from '../components/Header';
import { ThoughtCard } from '../components/ThoughtCard';
import { WeatherCard } from '../components/WeatherCard';
import { HierarchicalLocationSelector } from '../components/HierarchicalLocationSelector';
import { CreateThoughtModal } from '../components/CreateThoughtModal';
import { MapView } from '../components/MapView';
import { FeedFilter } from '../components/FeedFilter';
import { CommentsDrawer } from '../components/CommentsDrawer';
import { ReportModal } from '../components/ReportModal';
import { UserSettingsModal } from '../components/UserSettingsModal';
import { PwaInstallGateModal } from '../components/PwaInstallGateModal';

import { createAnonymousAlias, getCachedAlias, saveCachedAlias, Alias } from '../../domain/entities/Alias';
import { Location } from '../../domain/entities/Location';
import { Thought, Category } from '../../domain/entities/Thought';
import { Comment } from '../../domain/entities/Comment';
import { Weather } from '../../domain/entities/Weather';
import { ReportReason } from '../../domain/entities/Report';

// Infrastructure Adapters & Gateways
import { SupabaseThoughtRepository } from '../../infrastructure/repositories/SupabaseThoughtRepository';
import { SupabaseLocationRepository } from '../../infrastructure/repositories/SupabaseLocationRepository';
import { OpenWeatherGateway } from '../../infrastructure/weather/OpenWeatherGateway';
import { ensureAnonymousAuthSession } from '../../infrastructure/supabase/client';
import { AIModerationGateway } from '../../infrastructure/ai/AIModerationGateway';
import { GeolocationService } from '../../application/services/GeolocationService';
import { runDomainVerificationTests } from '../../test/domain.test';

// Use Cases
import { GetFeedUseCase } from '../../application/use-cases/GetFeedUseCase';
import { CreateThoughtUseCase } from '../../application/use-cases/CreateThoughtUseCase';
import { GetWeatherUseCase } from '../../application/use-cases/GetWeatherUseCase';
import { GetCommentsUseCase } from '../../application/use-cases/GetCommentsUseCase';
import { AddCommentUseCase } from '../../application/use-cases/AddCommentUseCase';
import { ReportContentUseCase } from '../../application/use-cases/ReportContentUseCase';
import { ToggleSaveThoughtUseCase } from '../../application/use-cases/ToggleSaveThoughtUseCase';

import { Sparkles, RefreshCw, MessageSquare, Compass, Navigation, MapPin, PlusCircle, CheckCircle2, User } from 'lucide-react';

export const HomePage: React.FC = () => {
  // Clean Architecture Repositories & Services
  const thoughtRepo = useMemo(() => new SupabaseThoughtRepository(), []);
  const locationRepo = useMemo(() => new SupabaseLocationRepository(), []);
  const weatherGateway = useMemo(() => new OpenWeatherGateway(), []);
  const aiGateway = useMemo(() => new AIModerationGateway(), []);

  // Use Cases
  const getFeedUseCase = useMemo(() => new GetFeedUseCase(thoughtRepo), [thoughtRepo]);
  const createThoughtUseCase = useMemo(() => new CreateThoughtUseCase(thoughtRepo), [thoughtRepo]);
  const getWeatherUseCase = useMemo(() => new GetWeatherUseCase(weatherGateway), [weatherGateway]);
  const getCommentsUseCase = useMemo(() => new GetCommentsUseCase(thoughtRepo), [thoughtRepo]);
  const addCommentUseCase = useMemo(() => new AddCommentUseCase(thoughtRepo), [thoughtRepo]);
  const reportContentUseCase = useMemo(() => new ReportContentUseCase(thoughtRepo), [thoughtRepo]);
  const toggleSaveThoughtUseCase = useMemo(() => new ToggleSaveThoughtUseCase(thoughtRepo), [thoughtRepo]);

  // Direct PWA Install Gate State (Show install prompt first before username/location onboarding)
  const [showPwaInstallGate, setShowPwaInstallGate] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    let alreadyInstalled = false;
    try {
      alreadyInstalled = localStorage.getItem('tala_pwa_installed_v1') === 'true';
    } catch {
      // Ignore
    }
    return !isStandalone && !alreadyInstalled;
  });

  // Cached Username & First-Time Install Onboarding State
  const [currentAlias, setCurrentAlias] = useState<Alias>(() => {
    const cached = getCachedAlias();
    return cached || createAnonymousAlias();
  });
  const [isFirstTimeUser, setIsFirstTimeUser] = useState<boolean>(() => !getCachedAlias());
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(() => !getCachedAlias());

  // Feed Mode: All Community Notes vs My Notes
  const [viewOnlyMyNotes, setViewOnlyMyNotes] = useState<boolean>(false);

  const [locations, setLocations] = useState<Location[]>(() => {
    try {
      const savedLoc = localStorage.getItem('tala_cached_user_location_v1');
      if (savedLoc) {
        return [JSON.parse(savedLoc) as Location];
      }
    } catch {
      // Ignore storage error
    }
    return [];
  });

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(() => {
    try {
      const savedLoc = localStorage.getItem('tala_cached_user_location_v1');
      if (savedLoc) {
        return JSON.parse(savedLoc) as Location;
      }
    } catch {
      // Ignore storage error
    }
    return null;
  });

  // Live User Geolocation State & 5km Nearby Locations (Cached across refreshes)
  const [userGpsCoords, setUserGpsCoords] = useState<{ lat: number; lng: number } | null>(() => {
    try {
      const savedGps = localStorage.getItem('tala_cached_user_gps_v1');
      if (savedGps) {
        return JSON.parse(savedGps) as { lat: number; lng: number };
      }
    } catch {
      // Ignore storage error
    }
    return null;
  });

  const [nearby5kmLocations, setNearby5kmLocations] = useState<Location[]>(() => {
    try {
      const savedNearby = localStorage.getItem('tala_cached_nearby_5km_v1');
      if (savedNearby) {
        return JSON.parse(savedNearby) as Location[];
      }
    } catch {
      // Ignore storage error
    }
    return [];
  });

  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationBannerMsg, setLocationBannerMsg] = useState<string | null>(null);

  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [allThoughtsForUser, setAllThoughtsForUser] = useState<Thought[]>([]);
  const [loadingFeed, setLoadingFeed] = useState<boolean>(true);
  
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loadingWeather, setLoadingWeather] = useState<boolean>(false);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'latest' | 'trending'>('latest');

  // Modals & Drawers State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  const [activeThoughtForComments, setActiveThoughtForComments] = useState<Thought | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState<boolean>(false);

  const [reportTarget, setReportTarget] = useState<{ type: 'thought' | 'comment'; id: string } | null>(null);

  // Initialize Session, Service Worker, and Domain Verification Tests
  useEffect(() => {
    ensureAnonymousAuthSession();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('PWA ServiceWorker registration notice:', err);
      });
    }

    const testResult = runDomainVerificationTests();
    console.log('[Tala System Verification]', testResult.passed ? 'ALL PASSED' : 'FAILED', testResult.log);
  }, []);

  // Persist and register an exact reverse-geocoded location + 5km nearby addresses into state, localStorage & Supabase
  const registerExactLocation = async (
    exactLoc: Location,
    coords: { lat: number; lng: number },
    nearby5km?: Location[]
  ): Promise<Location> => {
    const persisted = await locationRepo.ensureLocationPersisted(exactLoc);
    setUserGpsCoords(coords);

    const resolvedNearby =
      nearby5km && nearby5km.length > 0
        ? nearby5km
        : await GeolocationService.getNearbyLocationsWithin5km(coords.lat, coords.lng, persisted);

    setNearby5kmLocations(resolvedNearby);

    try {
      localStorage.setItem('tala_cached_user_location_v1', JSON.stringify(persisted));
      localStorage.setItem('tala_cached_user_gps_v1', JSON.stringify(coords));
      localStorage.setItem('tala_cached_nearby_5km_v1', JSON.stringify(resolvedNearby));
    } catch {
      // Ignore storage error
    }

    setLocations([persisted, ...resolvedNearby]);
    setSelectedLocation(persisted);
    return persisted;
  };

  // Request Browser GPS Location & Reverse Geocode Exact Address + 5km Radius Nearby Addresses
  const handleAllowUserLocation = async (): Promise<Location | null> => {
    setIsLocating(true);
    setLocationBannerMsg(null);
    try {
      const result = await GeolocationService.detectUserLocation();
      const persistedLoc = await registerExactLocation(
        result.exactLocation,
        result.coords,
        result.nearbyLocations
      );
      setLocationBannerMsg(
        `Exact location detected: ${persistedLoc.cityMunicipality}, ${persistedLoc.province} (+${result.nearbyLocations.length} nearby within 5km)`
      );
      return persistedLoc;
    } catch (err: any) {
      setLocationBannerMsg(err.message || 'Could not detect your exact location.');
      return null;
    } finally {
      setIsLocating(false);
    }
  };

  useEffect(() => {
    locationRepo.getAllLocations().then(async (data) => {
      let cachedLoc: Location | null = null;
      let cachedNearby: Location[] = [];
      try {
        const raw = localStorage.getItem('tala_cached_user_location_v1');
        if (raw) cachedLoc = JSON.parse(raw) as Location;
        const rawNearby = localStorage.getItem('tala_cached_nearby_5km_v1');
        if (rawNearby) cachedNearby = JSON.parse(rawNearby) as Location[];
      } catch {
        // Ignore
      }

      if (cachedLoc) {
        if (cachedNearby.length === 0 && cachedLoc.coordinates) {
          cachedNearby = await GeolocationService.getNearbyLocationsWithin5km(
            cachedLoc.coordinates.lat,
            cachedLoc.coordinates.lng,
            cachedLoc
          );
          setNearby5kmLocations(cachedNearby);
          try {
            localStorage.setItem('tala_cached_nearby_5km_v1', JSON.stringify(cachedNearby));
          } catch {
            // Ignore
          }
        }
        setLocations([cachedLoc, ...cachedNearby]);
        setSelectedLocation(cachedLoc);

        // Refresh live GPS coordinates silently if permission is granted
        if ('permissions' in navigator && navigator.permissions?.query) {
          navigator.permissions
            .query({ name: 'geolocation' as PermissionName })
            .then((status) => {
              if (status.state === 'granted') {
                handleAllowUserLocation();
              }
            })
            .catch(() => {});
        }
      } else {
        // Try detecting user's real GPS location + 5km nearby addresses first
        const detected = await handleAllowUserLocation();
        if (!detected && data.length > 0) {
          setLocations([data[0]]);
          setSelectedLocation((prev) => prev || data[0]);
        }
      }
    });
  }, [locationRepo]);

  // Save validated username to localStorage cache
  const handleSaveUsername = (updatedAlias: Alias) => {
    saveCachedAlias(updatedAlias);
    setCurrentAlias(updatedAlias);
  };

  // Load Feed & User's Own Notes
  const loadFeed = async () => {
    try {
      setLoadingFeed(true);

      // Fetch unfiltered feed to also track all notes belonging to current user across locations
      const allData = await getFeedUseCase.execute({});
      setAllThoughtsForUser(allData);

      const feedData = await getFeedUseCase.execute({
        locationId: viewOnlyMyNotes ? undefined : selectedLocation?.id,
        category: selectedCategory,
        searchQuery,
      });

      let filtered = [...feedData];
      if (viewOnlyMyNotes) {
        filtered = filtered.filter(
          (t) =>
            t.authorAlias.displayName.toLowerCase() === currentAlias.displayName.toLowerCase() ||
            t.authorAlias.id === currentAlias.id
        );
      }

      if (sortBy === 'trending') {
        filtered.sort((a, b) => {
          const scoreA = a.reactions.heart + a.reactions.relate + a.reactions.support + a.commentCount * 2;
          const scoreB = b.reactions.heart + b.reactions.relate + b.reactions.support + b.commentCount * 2;
          return scoreB - scoreA;
        });
      }

      setThoughts(filtered);
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setLoadingFeed(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, [selectedLocation, selectedCategory, searchQuery, sortBy, viewOnlyMyNotes, currentAlias]);

  // All notes posted by the current cached user
  const myNotes = useMemo(() => {
    return allThoughtsForUser.filter(
      (t) =>
        t.authorAlias.displayName.toLowerCase() === currentAlias.displayName.toLowerCase() ||
        t.authorAlias.id === currentAlias.id
    );
  }, [allThoughtsForUser, currentAlias]);

  // Weather fetch via Open-Meteo using exact location coordinates
  useEffect(() => {
    if (!selectedLocation) return;
    const fetchWeather = async () => {
      setLoadingWeather(true);
      try {
        const weatherData = await getWeatherUseCase.execute(
          selectedLocation.id,
          selectedLocation.cityMunicipality,
          selectedLocation.coordinates
        );
        setWeather(weatherData);
      } catch (err) {
        console.error('Weather fetch error:', err);
      } finally {
        setLoadingWeather(false);
      }
    };
    fetchWeather();
  }, [selectedLocation, getWeatherUseCase]);

  // Comments Loader
  const handleOpenComments = async (thought: Thought) => {
    setActiveThoughtForComments(thought);
    setLoadingComments(true);
    try {
      const data = await getCommentsUseCase.execute(thought.id);
      setComments(data);
    } catch (err) {
      console.error('Failed to fetch comments', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async (thoughtId: string, body: string) => {
    await addCommentUseCase.execute(thoughtId, currentAlias, body);
    const updatedComments = await getCommentsUseCase.execute(thoughtId);
    setComments(updatedComments);
    await loadFeed();
  };

  const handleToggleSave = async (thoughtId: string) => {
    await toggleSaveThoughtUseCase.execute(thoughtId);
  };

  const handleSubmitReport = async (reason: ReportReason, details?: string) => {
    if (!reportTarget) return;
    await reportContentUseCase.execute(reportTarget.type, reportTarget.id, reason, details);
  };

  const handleCreateThought = async (params: {
    body: string;
    category: Category;
    location: Location;
    isEnvironmentalAlert: boolean;
  }) => {
    // Ensure username is cached when user posts
    saveCachedAlias(currentAlias);

    const persistedLocation = await locationRepo.ensureLocationPersisted(params.location);
    const aiAnalysis = await aiGateway.analyzeThoughtText(params.body);

    await createThoughtUseCase.execute({
      authorAlias: currentAlias,
      category: params.category,
      body: params.body,
      location: persistedLocation,
      isEnvironmentalAlert: params.isEnvironmentalAlert || Boolean(aiAnalysis.environmentalCategory),
    });

    setSelectedLocation(persistedLocation);
    await loadFeed();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      
      {/* Top Header Navigation */}
      <Header
        currentAlias={currentAlias}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onRequestGeoLocation={handleAllowUserLocation}
        isLocating={isLocating}
        selectedCityName={selectedLocation?.cityMunicipality}
      />

      {/* Main Content Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Location Prompt, Feed Controls & Notes (7 cols) */}
        <section className="lg:col-span-7 space-y-5">
          
          {/* Quick "Allow Location & Add a Note Where You Are" Action Card */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-sky-950/60 via-slate-900 to-teal-950/50 border border-sky-500/30 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
                  <h3 className="text-sm font-bold text-white">
                    {selectedLocation
                      ? `You are viewing ${selectedLocation.cityMunicipality}, ${selectedLocation.province}`
                      : 'Discover & Leave Notes Where You Are'}
                  </h3>
                </div>
                <p className="text-xs text-slate-300">
                  Signed in as <strong className="text-teal-400">{currentAlias.displayName}</strong>. Allow your location to detect your exact area and leave a note.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleAllowUserLocation}
                  disabled={isLocating}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-sky-500/30 text-sky-300 text-xs font-semibold transition-all disabled:opacity-50"
                >
                  <Navigation className={`w-3.5 h-3.5 text-sky-400 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>{isLocating ? 'Locating...' : 'Allow Location'}</span>
                </button>

                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition-all"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Leave a Note</span>
                </button>
              </div>
            </div>

            {locationBannerMsg && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-teal-300">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                <span>{locationBannerMsg}</span>
              </div>
            )}
          </div>

          {/* Feed Header + All Notes vs My Notes Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-sky-400" />
                {viewOnlyMyNotes ? `My Notes (${myNotes.length})` : 'Community Notes Feed'}
              </h2>
              <p className="text-xs text-slate-400">
                {viewOnlyMyNotes
                  ? `Showing notes posted by ${currentAlias.displayName}`
                  : selectedLocation
                  ? `Notes left in ${selectedLocation.cityMunicipality}, ${selectedLocation.province}`
                  : 'Showing notes across all Philippine regions'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Toggle between All Notes and My Notes */}
              <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
                <button
                  onClick={() => setViewOnlyMyNotes(false)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    !viewOnlyMyNotes
                      ? 'bg-sky-500 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All Notes
                </button>
                <button
                  onClick={() => setViewOnlyMyNotes(true)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                    viewOnlyMyNotes
                      ? 'bg-teal-500 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>My Notes ({myNotes.length})</span>
                </button>
              </div>

              <button
                onClick={() => loadFeed()}
                title="Refresh notes"
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loadingFeed ? 'animate-spin text-sky-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Search, Sort & Category Filter Bar */}
          <FeedFilter
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />

          {/* Notes Feed List */}
          {loadingFeed ? (
            <div className="space-y-4">
              {[1, 2, 3].map(n => (
                <div key={n} className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/50 animate-pulse space-y-3">
                  <div className="h-4 w-1/3 bg-slate-800 rounded"></div>
                  <div className="h-12 w-full bg-slate-800/80 rounded"></div>
                  <div className="h-3 w-1/4 bg-slate-800 rounded"></div>
                </div>
              ))}
            </div>
          ) : thoughts.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800 space-y-3">
              <MessageSquare className="w-10 h-10 mx-auto text-slate-600" />
              <h3 className="text-sm font-semibold text-slate-300">
                {viewOnlyMyNotes ? "You haven't left any notes yet" : 'No notes in this area yet'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {viewOnlyMyNotes
                  ? `Click "Leave a Note" to drop your first note as ${currentAlias.displayName}!`
                  : 'Be the first person to leave an anonymous note where you are!'}
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 text-white text-xs font-semibold hover:bg-sky-400 transition-colors mt-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Leave a Note
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {thoughts.map(thought => (
                <ThoughtCard
                  key={thought.id}
                  thought={thought}
                  onReact={async (id, type) => {
                    // Optimistic UI update so reaction increments immediately
                    setThoughts(prev =>
                      prev.map(item =>
                        item.id === id
                          ? { ...item, reactions: { ...item.reactions, [type]: item.reactions[type] + 1 } }
                          : item
                      )
                    );
                    await thoughtRepo.reactToThought(id, type);
                    await loadFeed();
                  }}
                  onOpenComments={handleOpenComments}
                  onToggleSave={handleToggleSave}
                  onReport={(t) => setReportTarget({ type: 'thought', id: t.id })}
                  onSelectLocation={(locId) => {
                    const loc = locations.find(l => l.id === locId);
                    if (loc) setSelectedLocation(loc);
                  }}
                />
              ))}
            </div>
          )}

        </section>

        {/* Right Column: Map, Weather & Location Selector (5 cols) */}
        <aside className="lg:col-span-5 space-y-5">
          
          {/* Map Component */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Philippine Map View</span>
              <span className="text-[10px] text-sky-400">Click note bubble to read</span>
            </h3>
            <MapView
              locations={locations}
              thoughts={thoughts}
              selectedLocation={selectedLocation}
              userGpsCoords={userGpsCoords}
              onSelectLocation={(loc) => setSelectedLocation(loc)}
              onSelectThought={(thought) => handleOpenComments(thought)}
              onRequestGeoLocation={handleAllowUserLocation}
              isLocating={isLocating}
            />
          </div>

          {/* Weather Integration */}
          <WeatherCard weather={weather} loading={loadingWeather} />

          {/* Hierarchical Location Selector */}
          <HierarchicalLocationSelector
            locations={locations}
            selectedLocationId={selectedLocation?.id}
            onSelectLocation={(loc) => setSelectedLocation(loc)}
          />

        </aside>

      </main>

      {/* Modals & Drawers */}
      {showPwaInstallGate && (
        <PwaInstallGateModal
          onInstalledOrContinue={() => {
            setShowPwaInstallGate(false);
          }}
        />
      )}

      <UserSettingsModal
        isOpen={isSettingsModalOpen && !showPwaInstallGate}
        isFirstTimeOnboarding={isFirstTimeUser}
        onClose={() => {
          setIsFirstTimeUser(false);
          setIsSettingsModalOpen(false);
        }}
        currentAlias={currentAlias}
        userNotes={myNotes}
        onSaveUsername={handleSaveUsername}
        onRequestLocation={handleAllowUserLocation}
        isLocating={isLocating}
        detectedLocation={selectedLocation}
        hasGpsCoords={Boolean(userGpsCoords)}
        onSelectNote={(thought) => {
          setSelectedLocation(thought.location);
          handleOpenComments(thought);
        }}
      />

      <CreateThoughtModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentAlias={currentAlias}
        locations={locations}
        selectedLocation={selectedLocation || locations[0] || null}
        userGpsCoords={userGpsCoords}
        nearbyLocations={nearby5kmLocations}
        onExactLocationDetected={registerExactLocation}
        onSubmit={handleCreateThought}
      />

      <CommentsDrawer
        isOpen={Boolean(activeThoughtForComments)}
        onClose={() => setActiveThoughtForComments(null)}
        thought={activeThoughtForComments}
        currentAlias={currentAlias}
        comments={comments}
        loading={loadingComments}
        onAddComment={handleAddComment}
        onReportComment={(commentId) => setReportTarget({ type: 'comment', id: commentId })}
      />

      <ReportModal
        isOpen={Boolean(reportTarget)}
        onClose={() => setReportTarget(null)}
        targetType={reportTarget?.type || 'thought'}
        targetId={reportTarget?.id || ''}
        onSubmitReport={handleSubmitReport}
      />

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-slate-900 bg-slate-950 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>Tala — Anonymous Location Notes for the Philippines</span>
          <span>Leave a note where you are. 🇵🇭</span>
        </div>
      </footer>

    </div>
  );
};
