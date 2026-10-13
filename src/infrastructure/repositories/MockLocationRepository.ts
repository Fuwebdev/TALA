import { Location } from '../../domain/entities/Location';
import { ILocationRepository } from '../../domain/repositories/ILocationRepository';

export const PHILIPPINE_LOCATIONS: Location[] = [
  {
    id: 'loc-1',
    region: 'National Capital Region (NCR)',
    province: 'Metro Manila',
    cityMunicipality: 'Quezon City',
    coordinates: { lat: 14.6760, lng: 121.0437 },
  },
  {
    id: 'loc-2',
    region: 'National Capital Region (NCR)',
    province: 'Metro Manila',
    cityMunicipality: 'Manila',
    coordinates: { lat: 14.5995, lng: 120.9842 },
  },
  {
    id: 'loc-3',
    region: 'Region VII (Central Visayas)',
    province: 'Cebu',
    cityMunicipality: 'Cebu City',
    coordinates: { lat: 10.3157, lng: 123.8854 },
  },
  {
    id: 'loc-4',
    region: 'Region XI (Davao Region)',
    province: 'Davao del Sur',
    cityMunicipality: 'Davao City',
    coordinates: { lat: 7.1907, lng: 125.4553 },
  },
  {
    id: 'loc-5',
    region: 'Region VI (Western Visayas)',
    province: 'Iloilo',
    cityMunicipality: 'Iloilo City',
    coordinates: { lat: 10.7202, lng: 122.5621 },
  },
  {
    id: 'loc-6',
    region: 'Region I (Ilocos Region)',
    province: 'Ilocos Norte',
    cityMunicipality: 'Laoag City',
    coordinates: { lat: 18.1960, lng: 120.5927 },
  },
  {
    id: 'loc-7',
    region: 'CAR (Cordillera Administrative Region)',
    province: 'Benguet',
    cityMunicipality: 'Baguio City',
    coordinates: { lat: 16.4023, lng: 120.5960 },
  },
  {
    id: 'loc-8',
    region: 'Region X (Northern Mindanao)',
    province: 'Misamis Oriental',
    cityMunicipality: 'Cagayan de Oro',
    coordinates: { lat: 8.4542, lng: 124.6319 },
  },
  {
    id: 'loc-9',
    region: 'Region IV-A (CALABARZON)',
    province: 'Laguna',
    cityMunicipality: 'Los Baños',
    coordinates: { lat: 14.1678, lng: 121.2427 },
  },
];

export class MockLocationRepository implements ILocationRepository {
  private locations: Location[] = [...PHILIPPINE_LOCATIONS];

  async getAllLocations(): Promise<Location[]> {
    return this.locations;
  }

  async getLocationById(id: string): Promise<Location | null> {
    return this.locations.find(loc => loc.id === id) || null;
  }

  async searchLocations(query: string): Promise<Location[]> {
    const q = query.toLowerCase();
    return this.locations.filter(
      loc =>
        loc.cityMunicipality.toLowerCase().includes(q) ||
        loc.province.toLowerCase().includes(q) ||
        loc.region.toLowerCase().includes(q)
    );
  }

  async ensureLocationPersisted(location: Location): Promise<Location> {
    const existing = this.locations.find(
      l =>
        l.id === location.id ||
        l.cityMunicipality.toLowerCase() === location.cityMunicipality.toLowerCase()
    );
    if (existing) return existing;
    this.locations.unshift(location);
    return location;
  }
}
