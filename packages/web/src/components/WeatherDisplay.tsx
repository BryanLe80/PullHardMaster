import React from 'react';
import { Cloud, Droplets } from 'lucide-react';
import { useWeather, getWeatherIcon, type WeatherData } from '../lib/weather';

type WeatherDisplayProps = {
  latitude: number | null;
  longitude: number | null;
  timestamp?: number;
  compact?: boolean;
};

export function WeatherDisplay({ latitude, longitude, timestamp, compact = false }: WeatherDisplayProps) {
  const { weather, isLoading, error } = useWeather(
    latitude || 0,
    longitude || 0,
    timestamp
  );

  if (!latitude || !longitude) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="animate-pulse flex space-x-2 items-center text-gray-400">
        <Cloud className="h-4 w-4" />
        <span className="text-sm">Loading weather...</span>
      </div>
    );
  }

  if (error || !weather) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center space-x-2 text-gray-600">
        <img
          src={getWeatherIcon(weather.icon)}
          alt={weather.description}
          className="w-6 h-6"
        />
        <span className="text-sm">{Math.round(weather.temp)}°C</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <img
          src={getWeatherIcon(weather.icon)}
          alt={weather.description}
          className="w-8 h-8"
        />
        <div className="flex flex-col">
          <span className="text-sm font-medium">{Math.round(weather.temp)}°C</span>
          <span className="text-xs text-gray-500 capitalize">{weather.description}</span>
        </div>
      </div>
      <div className="flex items-center space-x-1 text-gray-500">
        <Droplets className="h-4 w-4" />
        <span className="text-sm">{weather.humidity}%</span>
      </div>
    </div>
  );
}