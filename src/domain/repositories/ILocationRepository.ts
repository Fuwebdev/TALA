import { Location } from '../entities/Location';

export interface ILocationRepository {
  getAllLocations(): Promise<Location[]>;
  getLocationById(id: string): Promise<Location | null>;
  searchLocations(query: string): Promise<Location[]>;
  ensureLocationPersisted(location: Location): Promise<Location>;
}
