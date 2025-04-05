import { WeatherData } from './weather';

// Scoring weights for different weather factors
const WEATHER_WEIGHTS = {
  temperature: {
    ideal: {
      min: 50, // Minimum ideal temperature in Fahrenheit
      max: 60, // Maximum ideal temperature in Fahrenheit
    },
    weight: 0.25,
    range: 20, // Acceptable range +/- from ideal range
  },
  humidity: {
    ideal: {
      min: 30, // Minimum ideal humidity percentage
      max: 50, // Maximum ideal humidity percentage
    },
    weight: 0.35,
    range: 20,
  },
  precipitation: {
    weight: 0.25,
    thresholds: {
      excellent: 20, // 20% or less chance of rain
      good: 40,     // 40% or less chance of rain
      fair: 60,     // 60% or less chance of rain
    }
  },
  conditions: {
    weight: 0.15,
    favorable: ['clear sky', 'few clouds', 'scattered clouds'],
    acceptable: ['broken clouds', 'overcast clouds'],
    unfavorable: ['rain', 'thunderstorm', 'snow', 'mist', 'fog'],
  },
};

// Helper function to get humidity rating
function getHumidityRating(humidity: number): string {
  if (humidity < WEATHER_WEIGHTS.humidity.ideal.min - 10) return 'Very Dry';
  if (humidity < WEATHER_WEIGHTS.humidity.ideal.min) return 'Dry';
  if (humidity <= WEATHER_WEIGHTS.humidity.ideal.max) return 'Ideal';
  if (humidity <= 70) return 'Humid';
  return 'Very Humid';
}

// Calculate a score for each weather condition
function calculateWeatherScore(weather: WeatherData): number {
  let score = 0;

  // Temperature score
  const temp = weather.temp;
  let tempScore = 0;
  if (temp >= WEATHER_WEIGHTS.temperature.ideal.min && temp <= WEATHER_WEIGHTS.temperature.ideal.max) {
    // Temperature is in ideal range
    tempScore = 1;
  } else {
    // Calculate how far the temperature is from the nearest ideal boundary
    const distanceFromIdeal = Math.min(
      Math.abs(temp - WEATHER_WEIGHTS.temperature.ideal.min),
      Math.abs(temp - WEATHER_WEIGHTS.temperature.ideal.max)
    );
    tempScore = Math.max(0, 1 - (distanceFromIdeal / WEATHER_WEIGHTS.temperature.range));
  }
  score += tempScore * WEATHER_WEIGHTS.temperature.weight;

  // Humidity score
  const humidity = weather.humidity;
  let humidityScore = 0;
  if (humidity >= WEATHER_WEIGHTS.humidity.ideal.min && humidity <= WEATHER_WEIGHTS.humidity.ideal.max) {
    // Humidity is in ideal range
    humidityScore = 1;
  } else {
    // Calculate how far the humidity is from the nearest ideal boundary
    const distanceFromIdeal = Math.min(
      Math.abs(humidity - WEATHER_WEIGHTS.humidity.ideal.min),
      Math.abs(humidity - WEATHER_WEIGHTS.humidity.ideal.max)
    );
    humidityScore = Math.max(0, 1 - (distanceFromIdeal / WEATHER_WEIGHTS.humidity.range));
  }
  score += humidityScore * WEATHER_WEIGHTS.humidity.weight;

  // Precipitation score
  let precipScore = 0;
  if (weather.precipitation <= WEATHER_WEIGHTS.precipitation.thresholds.excellent) {
    precipScore = 1;
  } else if (weather.precipitation <= WEATHER_WEIGHTS.precipitation.thresholds.good) {
    precipScore = 0.7;
  } else if (weather.precipitation <= WEATHER_WEIGHTS.precipitation.thresholds.fair) {
    precipScore = 0.3;
  }
  score += precipScore * WEATHER_WEIGHTS.precipitation.weight;

  // Weather conditions score
  const description = weather.description.toLowerCase();
  let conditionScore = 0;
  if (WEATHER_WEIGHTS.conditions.favorable.some(cond => description.includes(cond))) {
    conditionScore = 1;
  } else if (WEATHER_WEIGHTS.conditions.acceptable.some(cond => description.includes(cond))) {
    conditionScore = 0.5;
  }
  score += conditionScore * WEATHER_WEIGHTS.conditions.weight;

  return score;
}

// Get climbing condition rating based on score
function getConditionRating(score: number): {
  rating: 'Excellent' | 'Good' | 'Fair' | 'Poor',
  color: string
} {
  if (score >= 0.8) {
    return { rating: 'Excellent', color: 'text-green-600' };
  } else if (score >= 0.6) {
    return { rating: 'Good', color: 'text-blue-600' };
  } else if (score >= 0.4) {
    return { rating: 'Fair', color: 'text-yellow-600' };
  } else {
    return { rating: 'Poor', color: 'text-red-600' };
  }
}

// Generate climbing recommendations based on weather data
export function analyzeClimbingConditions(forecast: WeatherData[]) {
  const analysisResults = forecast.map(day => {
    const score = calculateWeatherScore(day);
    const { rating, color } = getConditionRating(score);
    const humidityRating = getHumidityRating(day.humidity);

    let recommendation = '';
    if (rating === 'Excellent') {
      recommendation = 'Perfect conditions for climbing. Get out there!';
    } else if (rating === 'Good') {
      recommendation = 'Good conditions for climbing. Consider planning a session.';
    } else if (rating === 'Fair') {
      if (day.temp < WEATHER_WEIGHTS.temperature.ideal.min) {
        recommendation = `A bit cold (${Math.round(day.temp)}°F). Layer up and bring hand warmers.`;
      } else if (day.temp > WEATHER_WEIGHTS.temperature.ideal.max) {
        recommendation = `A bit warm (${Math.round(day.temp)}°F). Consider climbing earlier or later in the day.`;
      } else if (day.humidity > 70) {
        recommendation = 'Very humid conditions. Grip may be significantly affected.';
      } else if (day.humidity > 55) {
        recommendation = 'High humidity may affect grip. Consider using extra chalk.';
      } else {
        recommendation = `Climbing is possible but be prepared for ${day.precipitation}% chance of rain.`;
      }
    } else {
      if (day.precipitation > WEATHER_WEIGHTS.precipitation.thresholds.fair) {
        recommendation = 'High chance of rain. Consider indoor climbing.';
      } else if (day.humidity > 70) {
        recommendation = 'Very humid conditions. Grip may be significantly affected.';
      } else if (day.temp < WEATHER_WEIGHTS.temperature.ideal.min - WEATHER_WEIGHTS.temperature.range) {
        recommendation = 'Too cold for optimal climbing. Indoor session recommended.';
      } else if (day.temp > WEATHER_WEIGHTS.temperature.ideal.max + WEATHER_WEIGHTS.temperature.range) {
        recommendation = 'Too warm for optimal climbing. Consider indoor climbing or rest day.';
      } else {
        recommendation = 'Not recommended for climbing. Consider indoor alternatives.';
      }
    }

    return {
      date: day.date,
      score,
      rating,
      color,
      humidityRating,
      recommendation,
      weather: {
        temp: day.temp,
        humidity: day.humidity,
        precipitation: day.precipitation,
        description: day.description,
        icon: day.icon,
      },
    };
  });

  return analysisResults;
}