import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ThermometerSun, Droplets, AlertTriangle, CloudRain } from 'lucide-react';
import { analyzeClimbingConditions } from '../lib/weatherML';
import { useWeather, getWeatherIcon } from '../lib/weather';

type ClimbingForecastProps = {
  latitude: number;
  longitude: number;
  location: string;
};

export function ClimbingForecast({ latitude, longitude, location }: ClimbingForecastProps) {
  const { forecast, isLoading, error } = useWeather(latitude, longitude);
  const daysPerWeek = 7;

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="space-y-3">
          {[...Array(daysPerWeek)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !forecast) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error loading forecast
            </h3>
          </div>
        </div>
      </div>
    );
  }

  const analysis = analyzeClimbingConditions(forecast);
  const visibleDays = analysis.slice(0, daysPerWeek);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {visibleDays.map((day) => (
          <div
            key={day.date}
            className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <div>
                <div className="text-sm text-gray-500">
                  {format(parseISO(day.date), 'EEEE, MMM d')}
                </div>
                <div className={`text-lg font-semibold ${day.color}`}>
                  {day.rating}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 md:col-span-2">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <img
                      src={getWeatherIcon(day.weather.icon)}
                      alt={day.weather.description}
                      className="w-10 h-10"
                    />
                    <div>
                      <div className="flex items-center">
                        <ThermometerSun className="h-4 w-4 text-gray-400 mr-1" />
                        <span>{Math.round(day.weather.temp)}°F</span>
                      </div>
                      <div className="flex items-center">
                        <Droplets className="h-4 w-4 text-gray-400 mr-1" />
                        <span>{day.weather.humidity}% ({day.humidityRating})</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CloudRain className="h-4 w-4 text-gray-400" />
                    <span>{day.weather.precipitation}% chance of rain</span>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                {day.recommendation}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}