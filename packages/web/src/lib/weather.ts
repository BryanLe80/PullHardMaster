import { supabase } from './supabase';
import useSWR from 'swr';

export type WeatherData = {
  date: string;
  temp: number;
  humidity: number;
  precipitation: number;
  description: string;
  icon: string;
};

const CACHE_KEY = 'weatherData';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

const fetcher = async (url: string) => {
  try {
    // Check cache first
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      // If cache is less than 30 minutes old, use it
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }

    // If no valid cache, fetch new data
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch weather data');
    }

    const data = await response.json();
    
    if (!Array.isArray(data) || !data.every(day => 
      day.date && 
      typeof day.temp === 'number' && 
      typeof day.humidity === 'number' &&
      typeof day.precipitation === 'number' &&
      day.description && 
      day.icon
    )) {
      throw new Error('Invalid weather data format');
    }

    // Store the data in localStorage with timestamp
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now()
    }));

    return data as WeatherData[];
  } catch (error) {
    // If fetch fails, try to use cached data as fallback
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      const { data } = JSON.parse(cachedData);
      console.warn('Using cached weather data due to fetch error');
      return data;
    }
    console.error('Weather fetcher error:', error);
    throw error;
  }
};

export function useWeather(lat: number, lon: number) {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
  });

  const { data, error } = useSWR(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/weather?${params}`,
    fetcher,
    {
      refreshInterval: CACHE_DURATION, // Only refresh after cache expires
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Dedupe requests within 1 minute
      retry: 3, // Retry failed requests 3 times
    }
  );

  return {
    forecast: data,
    isLoading: !error && !data,
    error,
  };
}

export function getWeatherIcon(code: string) {
  return `https://openweathermap.org/img/wn/${code}@2x.png`;
}