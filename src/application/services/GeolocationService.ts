import { Location } from '../../domain/entities/Location';

export interface GeolocationResult {
  coords: {
    lat: number;
    lng: number;
  };
  exactLocation: Location;
  nearbyLocations: Location[];
  formattedAddress: string;
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
    try {
      // Primary: OpenStreetMap Nominatim for detailed street/barangay/municipality resolution
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );

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

        // Combine Barangay/Suburb + City/Municipality for exact location clarity
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
    } catch (err) {
      console.warn('[GeolocationService] Nominatim reverse geocode fallback:', err);
    }

    try {
      // Secondary fallback: BigDataCloud free client-side reverse geocoder
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
      console.warn('[GeolocationService] BigDataCloud fallback failed:', err);
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

    // If Overpass returned fewer than 3 nearby places, sample 4 cardinal points ~2.2km away via BigDataCloud/Nominatim
    if (nearbyMap.size < 3) {
      const offsets = [
        { dLat: 0.018, dLng: 0 },     // ~2.0 km North
        { dLat: -0.018, dLng: 0 },    // ~2.0 km South
        { dLat: 0, dLng: 0.018 },     // ~2.0 km East
        { dLat: 0, dLng: -0.018 },    // ~2.0 km West
      ];

      await Promise.allSettled(
        offsets.map(async (offset) => {
          const sampleLat = lat + offset.dLat;
          const sampleLng = lng + offset.dLng;
          const distKm = this.calculateDistanceKm(lat, lng, sampleLat, sampleLng);
          if (distKm > 5.0) return;

          const loc = await this.reverseGeocode(sampleLat, sampleLng);
          const key = loc.cityMunicipality.toLowerCase().trim();
          if (key !== currentKey && !nearbyMap.has(key)) {
            nearbyMap.set(key, { distanceKm: distKm, loc });
          }
        })
      );
    }

    // Sort by closest distance first (all <= 5km)
    return Array.from(nearbyMap.values())
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 15)
      .map((entry) => entry.loc);
  }

  /**
   * Requests browser GPS permission and resolves with the user's exact reverse-geocoded location
   * plus nearby addresses within a 5km radius.
   */
  public static async detectUserLocation(): Promise<GeolocationResult> {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation is not supported by your browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const exactLocation = await this.reverseGeocode(latitude, longitude);
          const nearbyLocations = await this.getNearbyLocationsWithin5km(
            latitude,
            longitude,
            exactLocation
          );
          const formattedAddress = `${exactLocation.cityMunicipality}, ${exactLocation.province}`;

          resolve({
            coords: { lat: latitude, lng: longitude },
            exactLocation,
            nearbyLocations,
            formattedAddress,
          });
        },
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reject(new Error('Location permission was denied. Please allow location access in your browser.'));
              break;
            case error.POSITION_UNAVAILABLE:
              reject(new Error('Location information is currently unavailable.'));
              break;
            case error.TIMEOUT:
              reject(new Error('Location request timed out.'));
              break;
            default:
              reject(new Error('Failed to detect your exact location.'));
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        }
      );
    });
  }
}
