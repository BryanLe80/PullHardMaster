import React from 'react';
import { MapPin } from 'lucide-react';
import { ClimbingForecast } from './ClimbingForecast';

const CLIMBING_LOCATIONS = [
  {
    name: 'Chattanooga, TN',
    latitude: 35.0456,
    longitude: -85.3097,
    description: 'World-class sandstone bouldering and sport climbing areas like Stone Fort and Tennessee Wall.'
  },
  {
    name: 'Boone, NC',
    latitude: 36.2168,
    longitude: -81.4746,
    description: 'Excellent granite climbing in Grandfather Mountain State Park with routes for all skill levels.'
  },
  {
    name: 'Troutdale, VA',
    latitude: 36.7032,
    longitude: -81.4459,
    description: 'Home to Grayson Highlands State Park, offering exceptional bouldering on high-altitude granite.'
  }
];

export function WeatherPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Climbing Conditions Forecast
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Smart analysis of weather patterns to suggest optimal climbing times.
        </p>
      </div>

      <div className="grid gap-8">
        {CLIMBING_LOCATIONS.map((location) => (
          <div key={location.name} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start space-x-3 mb-6">
              <MapPin className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-1" />
              <div>
                <h2 className="font-medium text-gray-900 dark:text-gray-100">{location.name}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{location.description}</p>
              </div>
            </div>

            <ClimbingForecast
              latitude={location.latitude}
              longitude={location.longitude}
              location={location.name}
            />
          </div>
        ))}
      </div>

      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          About Our Weather Analysis System
        </h2>
        <div className="prose dark:prose-invert text-gray-600 dark:text-gray-300">
          <p>
            Our intelligent scoring system analyzes multiple weather factors to provide climbing condition recommendations:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-2">
            <li>Temperature (30% weight, optimal around 50-60°F)</li>
            <li>Precipitation (30% weight, best when chance is below 20%)</li>
            <li>Humidity (20% weight, ideal between 30-50%)</li>
            <li>Weather conditions (20% weight, favoring clear skies)</li>
          </ul>
          <p className="mt-4">
            The system uses a sophisticated weighted algorithm that combines these factors to calculate an overall climbing conditions score. 
            Each factor is analyzed against ideal climbing conditions based on established climbing weather preferences.
            Remember to always check local weather and crag conditions before climbing.
          </p>
        </div>
      </div>
    </div>
  );
}