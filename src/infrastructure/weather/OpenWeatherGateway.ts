import { IWeatherGateway } from '../../domain/repositories/IWeatherGateway';
import { Weather, WeatherCondition } from '../../domain/entities/Weather';
import { MockWeatherGateway } from './MockWeatherGateway';

interface WeatherCacheEntry {
  data: Weather;
  cachedAt: number;
}

/**
 * Open-Meteo Live Weather Gateway
 * Uses exact latitude/longitude (or Open-Meteo Geocoding) for real-time Philippine weather updates
 * with zero API key required.
 */
export class OpenWeatherGateway implements IWeatherGateway {
  private fallbackGateway = new MockWeatherGateway();
  private cache: Map<string, WeatherCacheEntry> = new Map();
  private CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes live cache window

  async getWeatherForLocation(
    locationId: string,
    cityName: string,
    coords?: { lat: number; lng: number }
  ): Promise<Weather> {
    const cacheKey = coords
      ? `${locationId}_${coords.lat.toFixed(3)}_${coords.lng.toFixed(3)}`
      : `${locationId}_${cityName}`;

    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      let targetLat = coords?.lat;
      let targetLng = coords?.lng;

      // If exact coordinates were not passed, geocode cityName via Open-Meteo Geocoding API
      if (typeof targetLat !== 'number' || typeof targetLng !== 'number') {
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=5&language=en&format=json`
        );
        if (geoRes.ok) {
          const geoJson = await geoRes.json();
          const results: any[] = geoJson.results || [];
          const phMatch = results.find((r) => r.country_code === 'PH') || results[0];
          if (phMatch && typeof phMatch.latitude === 'number' && typeof phMatch.longitude === 'number') {
            targetLat = phMatch.latitude;
            targetLng = phMatch.longitude;
          }
        }
      }

      // Default to Manila coordinates if geocoding couldn't resolve a custom name
      if (typeof targetLat !== 'number' || typeof targetLng !== 'number') {
        targetLat = 14.5995;
        targetLng = 120.9842;
      }

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${targetLat}&longitude=${targetLng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=Asia%2FManila`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Open-Meteo HTTP ${res.status}`);
      }

      const json = await res.json();
      const current = json.current;
      if (!current) {
        throw new Error('Open-Meteo response missing current weather block');
      }

      const condition = this.mapWmoWeatherCode(current.weather_code, current.wind_speed_10m);

      const weather: Weather = {
        locationId,
        cityName,
        temperatureCelsius: Math.round(current.temperature_2m ?? 28),
        feelsLikeCelsius: Math.round(current.apparent_temperature ?? current.temperature_2m ?? 30),
        humidityPercentage: Math.round(current.relative_humidity_2m ?? 75),
        condition,
        windSpeedKmh: Math.round(current.wind_speed_10m ?? 10),
        observationTimeISO: current.time ? new Date(current.time).toISOString() : new Date().toISOString(),
        provider: 'Open-Meteo Live Weather',
      };

      this.cache.set(cacheKey, { data: weather, cachedAt: Date.now() });
      return weather;
    } catch (err) {
      console.warn(`[Open-Meteo] Failed to fetch live weather for ${cityName}, using fallback.`, err);
      return this.fallbackGateway.getWeatherForLocation(locationId, cityName);
    }
  }

  /**
   * Maps WMO Weather interpretation codes (WW) from Open-Meteo to Tala WeatherCondition
   * https://open-meteo.com/en/docs
   */
  private mapWmoWeatherCode(code?: number, windSpeedKmh?: number): WeatherCondition {
    if (typeof windSpeedKmh === 'number' && windSpeedKmh >= 62) {
      return 'Tropical Storm Warning';
    }

    switch (code) {
      case 0:
        return 'Sunny';
      case 1:
      case 2:
        return 'Partly Cloudy';
      case 3:
      case 45:
      case 48:
        return 'Cloudy';
      case 51:
      case 53:
      case 55:
      case 56:
      case 57:
      case 61:
      case 63:
      case 80:
      case 81:
        return 'Light Rain';
      case 65:
      case 66:
      case 67:
      case 82:
        return 'Heavy Rain';
      case 95:
      case 96:
      case 99:
        return 'Thunderstorm';
      default:
        return 'Partly Cloudy';
    }
  }
}
