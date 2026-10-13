import { Location } from '../../domain/entities/Location';

export interface GeolocationResult {
  coords: {
    lat: number;
    lng: number;
  };
  exactLocation: Location;
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
   * Requests browser GPS permission and resolves with the user's exact reverse-geocoded location.
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
          const formattedAddress = `${exactLocation.cityMunicipality}, ${exactLocation.province}`;

          resolve({
            coords: { lat: latitude, lng: longitude },
            exactLocation,
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
