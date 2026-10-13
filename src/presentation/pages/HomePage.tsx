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
import { DeviceLockScreen } from '../components/DeviceLockScreen';
import { DeviceBanService, DeviceBanStatus } from '../../application/services/DeviceBanService';
import { ReportHistoryService, UserSubmittedReport } from '../../application/services/ReportHistoryService';

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
import { UpdateThoughtUseCase } from '../../application/use-cases/UpdateThoughtUseCase';
import { DeleteThoughtUseCase } from '../../application/use-cases/DeleteThoughtUseCase';
import { BlockUserUseCase } from '../../application/use-cases/BlockUserUseCase';
import { GetWeatherUseCase } from '../../application/use-cases/GetWeatherUseCase';
import { GetCommentsUseCase } from '../../application/use-cases/GetCommentsUseCase';
import { AddCommentUseCase } from '../../application/use-cases/AddCommentUseCase';
import { ReportContentUseCase } from '../../application/use-cases/ReportContentUseCase';
import { ToggleSaveThoughtUseCase } from '../../application/use-cases/ToggleSaveThoughtUseCase';
import { EditThoughtModal } from '../components/EditThoughtModal';

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
  const updateThoughtUseCase = useMemo(() => new UpdateThoughtUseCase(thoughtRepo), [thoughtRepo]);
  const deleteThoughtUseCase = useMemo(() => new DeleteThoughtUseCase(thoughtRepo), [thoughtRepo]);
  const blockUserUseCase = useMemo(() => new BlockUserUseCase(thoughtRepo), [thoughtRepo]);
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
  const [lastLocationError, setLastLocationError] = useState<string | null>(null);

  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [allThoughtsForUser, setAllThoughtsForUser] = useState<Thought[]>([]);
  const [loadingFeed, setLoadingFeed] = useState<boolean>(true);
  
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loadingWeather, setLoadingWeather] = useState<boolean>(false);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'latest' | 'trending'>('latest');
  const [highlightedThoughtId, setHighlightedThoughtId] = useState<string | null>(null);

  // Modals & Drawers State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  const [activeThoughtForComments, setActiveThoughtForComments] = useState<Thought | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState<boolean>(false);

  const [reportTarget, setReportTarget] = useState<{
    type: 'thought' | 'comment';
    id: string;
    snippet?: string;
    authorName?: string;
    authorAliasId?: string;
  } | null>(null);

  // User Reports History State
  const [userReports, setUserReports] = useState<UserSubmittedReport[]>([]);

  // Note Edit Modal & User Blocking State
  const [editingThought, setEditingThought] = useState<Thought | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('tala_blocked_aliases_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Device Ban & Safety Lock State
  const [deviceBanStatus, setDeviceBanStatus] = useState<DeviceBanStatus | null>(null);

  const checkDeviceBan = async () => {
    try {
      const status = await DeviceBanService.checkDeviceStatus();
      if (status.isBanned) {
        setDeviceBanStatus(status);
      } else {
        setDeviceBanStatus(null);
      }
    } catch (e) {
      console.warn('Failed to check device ban status:', e);
    }
  };

  const loadUserReports = async () => {
    try {
      const list = await ReportHistoryService.getReportsForUser(currentAlias.id);
      setUserReports(list);
    } catch (e) {
      console.warn('Failed to load user reports:', e);
    }
  };

  const handleReportResolved = async (reportData: {
    targetType: 'thought' | 'comment';
    targetId: string;
    contentSnippet: string;
    reportedAuthorName: string;
    reason: string;
    details?: string;
    resolution: {
      decision: 'VIOLATION_CONFIRMED' | 'ESCALATED' | 'NO_VIOLATION';
      aiResponseMessage: string;
      actionTaken: string;
      strikeStatus: string;
      banStatus: string;
    };
  }) => {
    const reportItem: UserSubmittedReport = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      targetType: reportData.targetType,
      targetId: reportData.targetId,
      contentSnippet: reportData.contentSnippet,
      reportedAuthorName: reportData.reportedAuthorName,
      reason: reportData.reason,
      details: reportData.details,
      createdAtISO: new Date().toISOString(),
      aiResolution: reportData.resolution,
    };

    await ReportHistoryService.recordSubmittedReport(currentAlias.id, reportItem);
    setUserReports((prev) => [reportItem, ...prev]);

    // If violation is confirmed, automatically quarantine that note or comment from current user's feed
    if (reportData.resolution.decision === 'VIOLATION_CONFIRMED') {
      if (reportData.targetType === 'thought') {
        setThoughts((prev) => prev.filter((t) => t.id !== reportData.targetId));
        setAllThoughtsForUser((prev) => prev.filter((t) => t.id !== reportData.targetId));
      } else if (reportData.targetType === 'comment') {
        setComments((prev) => prev.filter((c) => c.id !== reportData.targetId));
      }
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    await ReportHistoryService.deleteReport(currentAlias.id, reportId);
    setUserReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  // Initialize Session, Service Worker, Device Ban Check, User Reports, and Domain Verification Tests
  useEffect(() => {
    ensureAnonymousAuthSession();
    checkDeviceBan();
    loadUserReports();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('PWA ServiceWorker registration notice:', err);
      });
    }

    const testResult = runDomainVerificationTests();
    console.log('[Tala System Verification]', testResult.passed ? 'ALL PASSED' : 'FAILED', testResult.log);
  }, [currentAlias.id]);

  // Persist and register an exact reverse-geocoded location + 5km nearby addresses into state, localStorage & Supabase
  const registerExactLocation = async (
    exactLoc: Location,
    coords: { lat: number; lng: number },
    nearby5km?: Location[]
  ): Promise<Location> => {
    const persisted = await locationRepo.ensureLocationPersisted(exactLoc);
    setUserGpsCoords(coords);
    setLastLocationError(null);

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

    setLocations((prev) => {
      const combined = [persisted, ...resolvedNearby, ...prev];
      const seen = new Set<string>();
      return combined.filter((item) => {
        const key = `${item.cityMunicipality.toLowerCase()}|${item.province.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });
    setSelectedLocation(persisted);
    return persisted;
  };

  // Request Browser GPS Location & Reverse Geocode Exact Address + 5km Radius Nearby Addresses
  const handleAllowUserLocation = async (): Promise<Location | null> => {
    setIsLocating(true);
    setLocationBannerMsg(null);
    setLastLocationError(null);
    try {
      const result = await GeolocationService.detectUserLocation();
      const persistedLoc = await registerExactLocation(
        result.exactLocation,
        result.coords,
        result.nearbyLocations
      );
      const sourceLabel = result.source === 'ip' ? 'Network location' : 'Exact location';
      setLocationBannerMsg(
        `${sourceLabel} detected: ${persistedLoc.cityMunicipality}, ${persistedLoc.province} (+${result.nearbyLocations.length} nearby within 5km)`
      );
      return persistedLoc;
    } catch (err: any) {
      const msg = err.message || 'Could not detect your exact location.';
      setLastLocationError(msg);
      setLocationBannerMsg(msg);
      return null;
    } finally {
      setIsLocating(false);
    }
  };

  // Fallback Network / IP Location when browser GPS permission is blocked or unavailable
  const handleAllowNetworkLocation = async (): Promise<Location | null> => {
    setIsLocating(true);
    setLocationBannerMsg(null);
    setLastLocationError(null);
    try {
      const result = await GeolocationService.detectApproxLocationByIp();
      const persistedLoc = await registerExactLocation(
        result.exactLocation,
        result.coords,
        result.nearbyLocations
      );
      setLocationBannerMsg(
        `Network location detected: ${persistedLoc.cityMunicipality}, ${persistedLoc.province} (+${result.nearbyLocations.length} nearby within 5km)`
      );
      return persistedLoc;
    } catch (err: any) {
      const msg = err.message || 'Could not detect network location.';
      setLastLocationError(msg);
      setLocationBannerMsg(msg);
      return null;
    } finally {
      setIsLocating(false);
    }
  };

  // Manual Barangay / City Selection Fallback
  const handleSelectManualLocation = async (manualLoc: Location): Promise<Location> => {
    setIsLocating(true);
    setLastLocationError(null);
    try {
      const nearby = await GeolocationService.getNearbyLocationsWithin5km(
        manualLoc.coordinates.lat,
        manualLoc.coordinates.lng,
        manualLoc
      );
      const persistedLoc = await registerExactLocation(
        manualLoc,
        manualLoc.coordinates,
        nearby
      );
      setLocationBannerMsg(
        `Location set to: ${persistedLoc.cityMunicipality}, ${persistedLoc.province} (+${nearby.length} nearby within 5km)`
      );
      return persistedLoc;
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
        const merged = [cachedLoc, ...cachedNearby, ...data];
        const seen = new Set<string>();
        setLocations(
          merged.filter((item) => {
            const key = `${item.cityMunicipality.toLowerCase()}|${item.province.toLowerCase()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
        );
        setSelectedLocation(cachedLoc);
      } else {
        // Populate full Philippine locations list so user always has locations even before/without GPS
        setLocations(data);
        if (data.length > 0) {
          setSelectedLocation((prev) => prev || data[0]);
        }
      }

      // Only auto-refresh GPS silently on mount if browser permission is ALREADY granted
      // (Avoids triggering an unprompted GPS request before the user clicks "Allow Location")
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
    });
  }, [locationRepo]);

  // Save validated username to localStorage cache
  const handleSaveUsername = (updatedAlias: Alias) => {
    saveCachedAlias(updatedAlias);
    setCurrentAlias(updatedAlias);
  };

  // Sync blocked IDs from repository on alias change
  useEffect(() => {
    blockUserUseCase.getBlockedUserIds(currentAlias.id).then((ids) => {
      if (ids && ids.length > 0) {
        setBlockedUserIds((prev) => {
          const merged = Array.from(new Set([...prev, ...ids]));
          try {
            localStorage.setItem('tala_blocked_aliases_v1', JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    });
  }, [currentAlias.id, blockUserUseCase]);

  const isAuthorBlocked = (author: { id: string; displayName: string }) => {
    const name = author.displayName.toLowerCase();
    return blockedUserIds.some((b) => b.toLowerCase() === name || b === author.id);
  };

  // Load Feed & User's Own Notes
  const loadFeed = async () => {
    try {
      setLoadingFeed(true);

      // Fetch unfiltered feed to also track all notes belonging to current user across locations
      const allData = await getFeedUseCase.execute({});
      const now = Date.now();
      const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
      let unexpiredAll = allData.filter(
        (t) => now - new Date(t.createdAtISO).getTime() <= TWENTY_FOUR_HOURS_MS
      );
      // Filter out blocked authors
      unexpiredAll = unexpiredAll.filter((t) => !isAuthorBlocked(t.authorAlias));
      setAllThoughtsForUser(unexpiredAll);

      const feedData = await getFeedUseCase.execute({
        locationId: viewOnlyMyNotes ? undefined : selectedLocation?.id,
        category: selectedCategory,
        searchQuery,
      });

      let filtered = feedData.filter(
        (t) => now - new Date(t.createdAtISO).getTime() <= TWENTY_FOUR_HOURS_MS
      );
      // Filter out blocked authors
      filtered = filtered.filter((t) => !isAuthorBlocked(t.authorAlias));

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
  }, [selectedLocation, selectedCategory, searchQuery, sortBy, viewOnlyMyNotes, currentAlias, blockedUserIds]);


  // All notes posted by the current cached user (only unexpired active notes)
  const myNotes = useMemo(() => {
    const now = Date.now();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    return allThoughtsForUser.filter(
      (t) =>
        now - new Date(t.createdAtISO).getTime() <= TWENTY_FOUR_HOURS_MS &&
        (t.authorAlias.displayName.toLowerCase() === currentAlias.displayName.toLowerCase() ||
          t.authorAlias.id === currentAlias.id)
    );
  }, [allThoughtsForUser, currentAlias]);

  // Combined thoughts across the entire Philippines so ALL notes display on the map with lollipop icons (only unexpired notes)
  const allMapThoughts = useMemo(() => {
    const map = new Map<string, Thought>();
    const now = Date.now();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

    allThoughtsForUser.forEach((t) => {
      if (now - new Date(t.createdAtISO).getTime() <= TWENTY_FOUR_HOURS_MS) {
        map.set(t.id, t);
      }
    });

    thoughts.forEach((t) => {
      if (now - new Date(t.createdAtISO).getTime() <= TWENTY_FOUR_HOURS_MS) {
        map.set(t.id, t);
      }
    });

    return Array.from(map.values());
  }, [allThoughtsForUser, thoughts]);

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

    const createdThought = await createThoughtUseCase.execute({
      authorAlias: currentAlias,
      category: params.category,
      body: params.body,
      location: persistedLocation,
      isEnvironmentalAlert: params.isEnvironmentalAlert || Boolean(aiAnalysis.environmentalCategory),
    });

    // Remove any previous note(s) from this author so only the newest active note remains
    setAllThoughtsForUser((prev) => [
      createdThought,
      ...prev.filter(
        (t) =>
          t.authorAlias.displayName.toLowerCase() !== currentAlias.displayName.toLowerCase() &&
          t.authorAlias.id !== currentAlias.id
      ),
    ]);
    setThoughts((prev) => [
      createdThought,
      ...prev.filter(
        (t) =>
          t.authorAlias.displayName.toLowerCase() !== currentAlias.displayName.toLowerCase() &&
          t.authorAlias.id !== currentAlias.id
      ),
    ]);
    setSelectedLocation(persistedLocation);
    setHighlightedThoughtId(createdThought.id);
    setLocationBannerMsg(
      `New note dropped! Your previous note was replaced and the new one is pinned on the map (expires in 24h).`
    );
    await loadFeed();
  };

  const handleEditThought = (thought: Thought) => {
    setEditingThought(thought);
  };

  const handleSaveUpdatedThought = async (
    thoughtId: string,
    params: { body: string; category: Category; isEnvironmentalAlert: boolean }
  ) => {
    const updated = await updateThoughtUseCase.execute(thoughtId, params);
    setThoughts((prev) => prev.map((t) => (t.id === thoughtId ? updated : t)));
    setAllThoughtsForUser((prev) => prev.map((t) => (t.id === thoughtId ? updated : t)));
    setLocationBannerMsg('Your note was updated successfully!');
  };

  const handleDeleteThought = async (thoughtId: string) => {
    await deleteThoughtUseCase.execute(thoughtId);
    setThoughts((prev) => prev.filter((t) => t.id !== thoughtId));
    setAllThoughtsForUser((prev) => prev.filter((t) => t.id !== thoughtId));
    if (activeThoughtForComments?.id === thoughtId) {
      setActiveThoughtForComments(null);
    }
    setLocationBannerMsg('Your note has been deleted.');
  };

  const handleBlockUser = async (aliasId: string, aliasDisplayName: string) => {
    await blockUserUseCase.block(currentAlias.id, aliasDisplayName);
    if (aliasId && aliasId !== 'anon') {
      await blockUserUseCase.block(currentAlias.id, aliasId);
    }
    const updated = Array.from(new Set([...blockedUserIds, aliasDisplayName, aliasId].filter(Boolean)));
    setBlockedUserIds(updated);
    try {
      localStorage.setItem('tala_blocked_aliases_v1', JSON.stringify(updated));
    } catch {}
    setThoughts((prev) =>
      prev.filter(
        (t) =>
          t.authorAlias.displayName.toLowerCase() !== aliasDisplayName.toLowerCase() &&
          t.authorAlias.id !== aliasId
      )
    );
    setAllThoughtsForUser((prev) =>
      prev.filter(
        (t) =>
          t.authorAlias.displayName.toLowerCase() !== aliasDisplayName.toLowerCase() &&
          t.authorAlias.id !== aliasId
      )
    );
    setLocationBannerMsg(`Blocked ${aliasDisplayName}. Their notes and comments are hidden.`);
  };

  const handleUnblockUser = async (aliasIdOrName: string) => {
    await blockUserUseCase.unblock(currentAlias.id, aliasIdOrName);
    const updated = blockedUserIds.filter((b) => b !== aliasIdOrName);
    setBlockedUserIds(updated);
    try {
      localStorage.setItem('tala_blocked_aliases_v1', JSON.stringify(updated));
    } catch {}
    setLocationBannerMsg(`Unblocked ${aliasIdOrName}.`);
    await loadFeed();
  };


  if (deviceBanStatus?.isBanned) {
    return (
      <DeviceLockScreen
        banStatus={deviceBanStatus}
        onRefreshCheck={checkDeviceBan}
        aliasName={currentAlias.displayName}
      />
    );
  }

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

              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  onClick={handleAllowUserLocation}
                  disabled={isLocating}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-sky-500/30 text-sky-300 text-xs font-semibold transition-all disabled:opacity-50 active:scale-95"
                >
                  <Navigation className={`w-3.5 h-3.5 text-sky-400 ${isLocating ? 'animate-spin' : ''}`} />
                  <span className="truncate">{isLocating ? 'Locating...' : 'Allow GPS'}</span>
                </button>

                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition-all active:scale-95"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span className="truncate">Leave a Note</span>
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
                  isAuthor={
                    thought.authorAlias.displayName.toLowerCase() === currentAlias.displayName.toLowerCase() ||
                    thought.authorAlias.id === currentAlias.id
                  }
                  onEdit={handleEditThought}
                  onDelete={handleDeleteThought}
                  onBlockAuthor={(t) => handleBlockUser(t.authorAlias.id, t.authorAlias.displayName)}
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
                  onReport={(t) =>
                    setReportTarget({
                      type: 'thought',
                      id: t.id,
                      snippet: t.body,
                      authorName: t.authorAlias.displayName,
                      authorAliasId: t.authorAlias.id,
                    })
                  }
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
              thoughts={allMapThoughts}
              selectedLocation={selectedLocation}
              userGpsCoords={userGpsCoords}
              highlightedThoughtId={highlightedThoughtId}
              onSelectLocation={(loc) => setSelectedLocation(loc)}
              onSelectThought={(thought) => {
                setHighlightedThoughtId(thought.id);
                handleOpenComments(thought);
              }}
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
        blockedUserIds={blockedUserIds}
        userReports={userReports}
        onDeleteReport={handleDeleteReport}
        onSaveUsername={handleSaveUsername}
        onRequestLocation={handleAllowUserLocation}
        onRequestIpLocation={handleAllowNetworkLocation}
        onSelectManualLocation={handleSelectManualLocation}
        availableLocations={locations}
        lastLocationError={lastLocationError}
        isLocating={isLocating}
        detectedLocation={selectedLocation}
        hasGpsCoords={Boolean(userGpsCoords)}
        onSelectNote={(thought) => {
          setSelectedLocation(thought.location);
          handleOpenComments(thought);
        }}
        onEditNote={handleEditThought}
        onDeleteNote={handleDeleteThought}
        onUnblockUser={handleUnblockUser}
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

      <EditThoughtModal
        isOpen={Boolean(editingThought)}
        onClose={() => setEditingThought(null)}
        thought={editingThought}
        onUpdate={handleSaveUpdatedThought}
        onDelete={handleDeleteThought}
      />

      <CommentsDrawer
        isOpen={Boolean(activeThoughtForComments)}
        onClose={() => setActiveThoughtForComments(null)}
        thought={activeThoughtForComments}
        currentAlias={currentAlias}
        comments={comments.filter(c => !isAuthorBlocked(c.authorAlias))}
        loading={loadingComments}
        onAddComment={handleAddComment}
        onReportComment={(comment) =>
          setReportTarget({
            type: 'comment',
            id: comment.id,
            snippet: comment.body,
            authorName: comment.authorAlias.displayName,
            authorAliasId: comment.authorAlias.id,
          })
        }
        onBlockUser={(aliasId, aliasName) => handleBlockUser(aliasId, aliasName)}
      />

      <ReportModal
        isOpen={Boolean(reportTarget)}
        onClose={() => setReportTarget(null)}
        targetType={reportTarget?.type || 'thought'}
        targetId={reportTarget?.id || ''}
        contentSnippet={reportTarget?.snippet || ''}
        reportedAuthorName={reportTarget?.authorName || 'Anonymous'}
        onSubmitReport={handleSubmitReport}
        onReportResolved={handleReportResolved}
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
