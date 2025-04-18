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
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        <div className="space-y-3">
          {[...Array(daysPerWeek)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !forecast) {
    return (
      <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-400 dark:text-red-500" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
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
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {format(parseISO(day.date), 'EEEE, MMM d')}
                </div>
                <div className={`text-lg font-semibold ${day.color} dark:text-opacity-90`}>
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
                      <div className="flex items-center text-gray-700 dark:text-gray-200">
                        <ThermometerSun className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-1" />
                        <span>{Math.round(day.weather.temp)}°F</span>
                      </div>
                      <div className="flex items-center text-gray-700 dark:text-gray-200">
                        <Droplets className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-1" />
                        <span>{day.weather.humidity}% ({day.humidityRating})</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-200">
                    <CloudRain className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <span>{day.weather.precipitation}% chance of rain</span>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-300">
                {day.recommendation}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}