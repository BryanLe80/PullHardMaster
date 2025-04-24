import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const WEATHER_API_KEY = '3e8fab842b3e9e54ab2cf6ec653d06c6';
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const lat = url.searchParams.get('lat');
    const lon = url.searchParams.get('lon');

    if (!lat || !lon) {
      throw new Error('Latitude and longitude are required');
    }

    console.log('Fetching weather data for:', { lat, lon });
    
    // Use the 5-day forecast endpoint which is available in the free tier
    const endpoint = `${WEATHER_API_URL}/forecast?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=imperial`;
    
    console.log('Calling OpenWeather API...');
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenWeather API error:', errorText);
      throw new Error(`Failed to fetch weather data: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Raw weather data received');

    // Group forecast data by day
    const dailyForecasts = data.list.reduce((acc: any, forecast: any) => {
      const date = new Date(forecast.dt * 1000).toISOString().split('T')[0];
      
      if (!acc[date]) {
        acc[date] = {
          date,
          temps: [],
          humidity: [],
          precipitation: [],
          descriptions: [],
          icons: []
        };
      }

      acc[date].temps.push(forecast.main.temp);
      acc[date].humidity.push(forecast.main.humidity);
      acc[date].precipitation.push((forecast.pop || 0) * 100);
      acc[date].descriptions.push(forecast.weather[0].description);
      acc[date].icons.push(forecast.weather[0].icon);

      return acc;
    }, {});

    // Calculate daily averages and most common conditions
    const weeklyForecast = Object.values(dailyForecasts).map((day: any) => ({
      date: day.date,
      temp: Math.round(day.temps.reduce((a: number, b: number) => a + b, 0) / day.temps.length),
      humidity: Math.round(day.humidity.reduce((a: number, b: number) => a + b, 0) / day.humidity.length),
      precipitation: Math.round(Math.max(...day.precipitation)), // Use maximum precipitation chance for the day
      description: day.descriptions.sort((a: string, b: string) =>
        day.descriptions.filter((v: string) => v === a).length -
        day.descriptions.filter((v: string) => v === b).length
      ).pop(),
      icon: day.icons.sort((a: string, b: string) =>
        day.icons.filter((v: string) => v === a).length -
        day.icons.filter((v: string) => v === b).length
      ).pop()
    }));

    console.log('Processed weekly forecast:', weeklyForecast);

    return new Response(
      JSON.stringify(weeklyForecast),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );

  } catch (error) {
    console.error('Weather API Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
});