import { IWeatherGateway } from '../../domain/repositories/IWeatherGateway';
import { Weather, WeatherCondition } from '../../domain/entities/Weather';

export class MockWeatherGateway implements IWeatherGateway {
  async getWeatherForLocation(locationId: string, cityName: string): Promise<Weather> {
    // Simulate lightweight network latency
    await new Promise(resolve => setTimeout(resolve, 150));

    const conditions: WeatherCondition[] = ['Partly Cloudy', 'Sunny', 'Light Rain', 'Thunderstorm', 'Cloudy'];
    
    // Deterministic mock based on city name string code
    const charCodeSum = cityName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const selectedCondition = conditions[charCodeSum % conditions.length];
    
    // Higher temp for tropical PH standard (26°C - 33°C)
    const baseTemp = 27 + (charCodeSum % 6);
    const humidity = 70 + (charCodeSum % 20);

    return {
      locationId,
      cityName,
      temperatureCelsius: baseTemp,
      feelsLikeCelsius: baseTemp + 3,
      humidityPercentage: humidity,
      condition: selectedCondition,
      windSpeedKmh: 12 + (charCodeSum % 10),
      observationTimeISO: new Date().toISOString(),
      provider: 'MockPHWeatherService (PAGASA-Simulated)',
    };
  }
}
