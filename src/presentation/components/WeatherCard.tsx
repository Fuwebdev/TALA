import React from 'react';
import { Sun, Cloud, CloudRain, CloudLightning, Wind, Droplets, Thermometer, ShieldAlert } from 'lucide-react';
import { Weather } from '../../domain/entities/Weather';

interface WeatherCardProps {
  weather: Weather | null;
  loading: boolean;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({ weather, loading }) => {
  if (loading) {
    return (
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/60 animate-pulse flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-28 bg-slate-800 rounded"></div>
          <div className="h-6 w-16 bg-slate-800 rounded"></div>
        </div>
        <div className="w-10 h-10 bg-slate-800 rounded-full"></div>
      </div>
    );
  }

  if (!weather) {
    return null;
  }

  const renderConditionIcon = () => {
    switch (weather.condition) {
      case 'Sunny':
        return <Sun className="w-7 h-7 text-amber-400 animate-spin-slow" />;
      case 'Partly Cloudy':
      case 'Cloudy':
        return <Cloud className="w-7 h-7 text-slate-300" />;
      case 'Light Rain':
      case 'Heavy Rain':
        return <CloudRain className="w-7 h-7 text-sky-400" />;
      case 'Thunderstorm':
      case 'Tropical Storm Warning':
        return <CloudLightning className="w-7 h-7 text-yellow-400" />;
      default:
        return <Sun className="w-7 h-7 text-amber-400" />;
    }
  };

  return (
    <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/50 to-sky-950/40 border border-sky-500/20 backdrop-blur-md shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400">Local Weather</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
              {weather.cityName}
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-white">
              {weather.temperatureCelsius}°C
            </span>
            <span className="text-xs text-slate-400">
              Feels like {weather.feelsLikeCelsius}°C
            </span>
          </div>

          <div className="flex items-center gap-3 mt-3 text-xs text-slate-300">
            <span className="flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-sky-400" />
              {weather.humidityPercentage}%
            </span>
            <span className="flex items-center gap-1">
              <Wind className="w-3.5 h-3.5 text-teal-400" />
              {weather.windSpeedKmh} km/h
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/50 shadow-inner">
            {renderConditionIcon()}
          </div>
          <span className="text-xs font-medium text-slate-300">
            {weather.condition}
          </span>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
        <span>Gateway: {weather.provider}</span>
        <span>Updated: {new Date(weather.observationTimeISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
};
