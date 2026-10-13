import { Location } from '../../domain/entities/Location';
import { PHILIPPINE_LOCATIONS } from '../../infrastructure/repositories/MockLocationRepository';

export interface GeolocationResult {
  coords: {
    lat: number;
    lng: number;
  };
  exactLocation: Location;
  nearbyLocations: Location[];
  formattedAddress: string;
  source?: 'gps' | 'network' | 'ip' | 'manual';
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class GeolocationService {
  /**
   * Calculates Haversine distance in kilometers between two GPS coordinates.
   */
  public static calculateDistanceKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Reverse geocodes exact GPS coordinates (latitude, longitude) into the user's real-world
   * Barangay / Street / City / Province / Region using OpenStreetMap Nominatim & BigDataCloud.
   */
  public static async reverseGeocode(lat: number, lng: number): Promise<Location> {
    // 1. Try our serverless proxy (/api/geocode) which attaches a custom User-Agent and handles CORS
    try {
      const res = await fetch(`/api/geocode?lat=${lat}&lon=${lng}&zoom=18`);
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};

        const subLocality =
          addr.suburb ||
          addr.village ||
          addr.neighbourhood ||
          addr.quarter ||
          addr.hamlet ||
          addr.road ||
          '';

        const cityOrTown =
          addr.city ||
          addr.town ||
          addr.municipality ||
          addr.county ||
          'Local Area';

        const province =
          addr.state ||
          addr.province ||
          addr.region ||
          cityOrTown;

        const region =
          addr.region ||
          addr.state_district ||
          addr.island ||
          'Philippines';

        const exactPlaceName =
          subLocality && subLocality.toLowerCase() !== cityOrTown.toLowerCase()
            ? `${subLocality}, ${cityOrTown}`
            : cityOrTown;

        return {
          id: generateUUID(),
          region,
          province,
          cityMunicipality: exactPlaceName,
          coordinates: { lat, lng },
        };
      }
    } catch {
      // Proceed to secondary CORS-friendly client fallback
    }

    // 2. Secondary fallback: BigDataCloud free client-side reverse geocoder (Full CORS support)
    try {
      const bdcRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      if (bdcRes.ok) {
        const bdc = await bdcRes.json();
        const locality = bdc.locality || bdc.city || 'Detected Location';
        const city = bdc.city && bdc.city !== locality ? `${locality}, ${bdc.city}` : locality;
        const province = bdc.principalSubdivision || 'Philippines';
        return {
          id: generateUUID(),
          region: bdc.countryName || 'Philippines',
          province,
          cityMunicipality: city,
          coordinates: { lat, lng },
        };
      }
    } catch (err) {
      console.warn('[GeolocationService] BigDataCloud fallback notice:', err);
    }

    // 3. Fallback: Find closest known Philippine city from database
    let closestCity = PHILIPPINE_LOCATIONS[0];
    let minDistance = Infinity;
    for (const loc of PHILIPPINE_LOCATIONS) {
      const d = this.calculateDistanceKm(lat, lng, loc.coordinates.lat, loc.coordinates.lng);
      if (d < minDistance) {
        minDistance = d;
        closestCity = loc;
      }
    }

    if (minDistance <= 25) {
      return {
        ...closestCity,
        id: generateUUID(),
        coordinates: { lat, lng },
      };
    }

    // Coordinate fallback if offline
    return {
      id: generateUUID(),
      region: 'Philippines',
      province: `GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      cityMunicipality: `Exact Location (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)`,
      coordinates: { lat, lng },
    };
  }


  /**
   * Fetches real nearby barangays, neighborhoods, streets, and localities within a 5km radius
   * of the user's current coordinates.
   */
  public static async getNearbyLocationsWithin5km(
    lat: number,
    lng: number,
    currentLocation: Location
  ): Promise<Location[]> {
    const nearbyMap = new Map<string, { loc: Location; distanceKm: number }>();
    const currentKey = currentLocation.cityMunicipality.toLowerCase().trim();

    // Extract base city name (e.g., "Barangay X, Quezon City" -> "Quezon City")
    const parts = currentLocation.cityMunicipality.split(',').map((s) => s.trim());
    const parentCity = parts.length > 1 ? parts[parts.length - 1] : currentLocation.cityMunicipality;

    try {
      // Query OpenStreetMap Overpass API for named barangays/suburbs/neighborhoods/villages within 5000m (5km)
      const overpassQuery = `[out:json][timeout:8];(node(around:5000,${lat},${lng})["place"~"suburb|village|neighbourhood|quarter|hamlet|town|city_block"];);out body 25;`;
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: overpassQuery,
      });

      if (res.ok) {
        const data = await res.json();
        const elements: any[] = data.elements || [];

        for (const el of elements) {
          const name = el.tags?.['name:en'] || el.tags?.name;
          if (!name || typeof el.lat !== 'number' || typeof el.lon !== 'number') continue;

          const distKm = this.calculateDistanceKm(lat, lng, el.lat, el.lon);
          if (distKm > 5.0) continue; // Strictly enforce 5km radius

          const formattedCity =
            name.toLowerCase().includes(parentCity.toLowerCase())
              ? name
              : `${name}, ${parentCity}`;

          const key = formattedCity.toLowerCase().trim();
          if (key === currentKey || nearbyMap.has(key)) continue;

          nearbyMap.set(key, {
            distanceKm: distKm,
            loc: {
              id: generateUUID(),
              region: currentLocation.region,
              province: currentLocation.province,
              cityMunicipality: formattedCity,
              coordinates: { lat: el.lat, lng: el.lon },
            },
          });
        }
      }
    } catch (err) {
      console.warn('[GeolocationService] Overpass 5km nearby lookup notice:', err);
    }

    // If Overpass returned fewer than 3 nearby places, supplement with closest Philippine locations
    if (nearbyMap.size < 3) {
      for (const loc of PHILIPPINE_LOCATIONS) {
        const distKm = this.calculateDistanceKm(lat, lng, loc.coordinates.lat, loc.coordinates.lng);
        if (distKm <= 20.0) {
          const key = loc.cityMunicipality.toLowerCase().trim();
          if (key !== currentKey && !nearbyMap.has(key)) {
            nearbyMap.set(key, { distanceKm: distKm, loc });
          }
        }
      }
    }


    // Sort by closest distance first (all <= 5km)
    return Array.from(nearbyMap.values())
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 15)
      .map((entry) => entry.loc);
  }

  /**
   * Helper to wrap navigator.geolocation.getCurrentPosition in a Promise with custom PositionOptions.
   */
  private static requestBrowserPosition(options: PositionOptions): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
        reject(new Error('Geolocation is not supported by your browser.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  /**
   * Fallback IP-based geolocation when a user's device lacks GPS hardware, timed out,
   * or when they click "Use Network / IP Location" because browser permission is blocked.
   */
  public static async detectApproxLocationByIp(): Promise<GeolocationResult> {
    // 1. Try BigDataCloud client reverse geocode (works without coordinates using client IP)
    try {
      const bdcRes = await fetch(
        'https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en'
      );
      if (bdcRes.ok) {
        const bdc = await bdcRes.json();
        if (typeof bdc.latitude === 'number' && typeof bdc.longitude === 'number') {
          const lat = bdc.latitude;
          const lng = bdc.longitude;
          const exactLocation = await this.reverseGeocode(lat, lng);
          const nearbyLocations = await this.getNearbyLocationsWithin5km(lat, lng, exactLocation);
          return {
            coords: { lat, lng },
            exactLocation,
            nearbyLocations,
            formattedAddress: `${exactLocation.cityMunicipality}, ${exactLocation.province}`,
            source: 'ip',
          };
        }
      }
    } catch (err) {
      console.warn('[GeolocationService] BigDataCloud IP fallback notice:', err);
    }

    // 2. Try GeoJS IP geolocation fallback
    try {
      const geoRes = await fetch('https://get.geojs.io/v1/ip/geo.json');
      if (geoRes.ok) {
        const geo = await geoRes.json();
        const lat = parseFloat(geo.latitude);
        const lng = parseFloat(geo.longitude);
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
          const exactLocation = await this.reverseGeocode(lat, lng);
          const nearbyLocations = await this.getNearbyLocationsWithin5km(lat, lng, exactLocation);
          return {
            coords: { lat, lng },
            exactLocation,
            nearbyLocations,
            formattedAddress: `${exactLocation.cityMunicipality}, ${exactLocation.province}`,
            source: 'ip',
          };
        }
      }
    } catch (err) {
      console.warn('[GeolocationService] GeoJS IP fallback notice:', err);
    }

    throw new Error('Could not detect network location. Please select your city or barangay below.');
  }

  /**
   * Searches Philippine barangays, cities, municipalities, or streets by text query
   * so users who cannot enable browser GPS can still find and lock their exact area.
   */
  public static async searchPhilippinePlaces(query: string): Promise<Location[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    try {
      // 1. Route search through serverless proxy with custom user-agent and CORS handling
      let items: any[] = [];
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          items = await res.json();
        }
      } catch {
        // Fallback to direct fetch only if local proxy unavailable
      }

      if (!items || items.length === 0) {
        try {
          const directRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              trimmed
            )}&countrycodes=ph&addressdetails=1&limit=8`,
            { headers: { 'Accept-Language': 'en' } }
          );
          if (directRes.ok) {
            items = await directRes.json();
          }
        } catch {
          // Fall back gracefully to local matching
        }
      }

      if (Array.isArray(items) && items.length > 0) {
        const results: Location[] = [];
        const seen = new Set<string>();

        for (const item of items) {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          if (Number.isNaN(lat) || Number.isNaN(lng)) continue;

          const addr = item.address || {};
          const subLocality =
            addr.suburb ||
            addr.village ||
            addr.neighbourhood ||
            addr.quarter ||
            addr.hamlet ||
            addr.road ||
            '';
          const cityOrTown =
            addr.city ||
            addr.town ||
            addr.municipality ||
            addr.county ||
            item.name ||
            trimmed;
          const province =
            addr.state ||
            addr.province ||
            addr.region ||
            cityOrTown;
          const region =
            addr.region ||
            addr.state_district ||
            'Philippines';

          const exactPlaceName =
            subLocality && subLocality.toLowerCase() !== cityOrTown.toLowerCase()
              ? `${subLocality}, ${cityOrTown}`
              : cityOrTown;

          const dedupeKey = `${exactPlaceName.toLowerCase()}|${province.toLowerCase()}`;
          if (seen.has(dedupeKey)) continue;
          seen.add(dedupeKey);

          results.push({
            id: generateUUID(),
            region,
            province,
            cityMunicipality: exactPlaceName,
            coordinates: { lat, lng },
          });
        }

        return results;
      }
    } catch (err) {
      console.warn('[GeolocationService] Nominatim search notice:', err);
    }

    return [];
  }

  /**
   * Requests browser GPS permission with a 2-stage fallback:
   * 1. High-accuracy GPS (7s timeout)
   * 2. Standard/network accuracy (8s timeout, cached up to 5 mins) if high-accuracy times out or is unavailable.
   */
  public static async detectUserLocation(): Promise<GeolocationResult> {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      throw new Error('Geolocation is not supported by your browser. Please search or pick your location manually below.');
    }

    let position: GeolocationPosition | null = null;
    let source: 'gps' | 'network' = 'gps';

    try {
      // Stage 1: Try High-Accuracy GPS first
      position = await this.requestBrowserPosition({
        enableHighAccuracy: true,
        timeout: 7000,
        maximumAge: 60000,
      });
    } catch (firstError: any) {
      // If permission was explicitly denied (code 1), don't retry getCurrentPosition; surface a helpful message
      if (firstError && firstError.code === 1) {
        throw new Error(
          'Browser location access is blocked. Tap the lock/settings icon in your browser address bar to allow Location, or pick your city/barangay below.'
        );
      }

      // Stage 2: Fallback to standard/Wi-Fi/network location (enableHighAccuracy: false)
      try {
        source = 'network';
        position = await this.requestBrowserPosition({
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 300000,
        });
      } catch (secondError: any) {
        if (secondError && secondError.code === 1) {
          throw new Error(
            'Browser location access is blocked. Tap the lock/settings icon in your browser address bar to allow Location, or pick your city/barangay below.'
          );
        }
        // Stage 3: Automatic IP/Network fallback when GPS hardware/service is unavailable or timed out even after user clicked Allow!
        try {
          return await this.detectApproxLocationByIp();
        } catch {
          if (secondError?.code === 3) {
            throw new Error('Location detection timed out. Please try "Detect via Network" or search your city/barangay below.');
          }
          throw new Error('Could not detect GPS signal on this device. Please search or select your city/barangay below.');
        }
      }
    }

    const { latitude, longitude } = position.coords;
    const exactLocation = await this.reverseGeocode(latitude, longitude);
    const nearbyLocations = await this.getNearbyLocationsWithin5km(
      latitude,
      longitude,
      exactLocation
    );
    const formattedAddress = `${exactLocation.cityMunicipality}, ${exactLocation.province}`;

    return {
      coords: { lat: latitude, lng: longitude },
      exactLocation,
      nearbyLocations,
      formattedAddress,
      source,
    };
  }
}

