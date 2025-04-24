import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';

type Location = {
  name: string;
  lat: number;
  lon: number;
};

type LocationSearchProps = {
  value: string;
  onChange: (value: string, lat?: number, lon?: number) => void;
  existingLocations?: string[];
};

export function LocationSearch({ value, onChange, existingLocations = [] }: LocationSearchProps) {
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const searchLocation = async () => {
      if (!value || existingLocations.includes(value)) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(
          `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(value)}&limit=5&appid=${import.meta.env.VITE_OPENWEATHER_API_KEY}`
        );
        const data = await response.json();
        setSearchResults(data.map((item: any) => ({
          name: `${item.name}, ${item.country}`,
          lat: item.lat,
          lon: item.lon,
        })));
      } catch (error) {
        console.error('Error searching location:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchLocation, 500);
    return () => clearTimeout(timeoutId);
  }, [value, existingLocations]);

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="Search location..."
          list="existing-locations"
        />
        <datalist id="existing-locations">
          {existingLocations.map((loc) => (
            <option key={loc} value={loc} />
          ))}
        </datalist>
      </div>

      {searchResults.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg">
          <ul className="max-h-60 overflow-auto rounded-md py-1 text-base">
            {searchResults.map((location) => (
              <li
                key={`${location.lat}-${location.lon}`}
                className="cursor-pointer flex items-center px-3 py-2 hover:bg-gray-100"
                onClick={() => {
                  onChange(location.name, location.lat, location.lon);
                  setSearchResults([]);
                }}
              >
                <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-700">{location.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isSearching && (
        <div className="absolute right-3 top-3">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
        </div>
      )}
    </div>
  );
}