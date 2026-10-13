import { Weather } from '../entities/Weather';

export interface IWeatherGateway {
  getWeatherForLocation(
    locationId: string,
    cityName: string,
    coords?: { lat: number; lng: number }
  ): Promise<Weather>;
}
