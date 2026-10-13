export type WeatherCondition = 
  | 'Sunny'
  | 'Partly Cloudy'
  | 'Cloudy'
  | 'Light Rain'
  | 'Heavy Rain'
  | 'Thunderstorm'
  | 'Tropical Storm Warning';

export interface Weather {
  locationId: string;
  cityName: string;
  temperatureCelsius: number;
  feelsLikeCelsius: number;
  humidityPercentage: number;
  condition: WeatherCondition;
  windSpeedKmh: number;
  observationTimeISO: string;
  provider: string;
}
