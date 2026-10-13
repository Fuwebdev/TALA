import { IWeatherGateway } from '../../domain/repositories/IWeatherGateway';
import { Weather } from '../../domain/entities/Weather';

export class GetWeatherUseCase {
  constructor(private weatherGateway: IWeatherGateway) {}

  async execute(
    locationId: string,
    cityName: string,
    coords?: { lat: number; lng: number }
  ): Promise<Weather> {
    return this.weatherGateway.getWeatherForLocation(locationId, cityName, coords);
  }
}
