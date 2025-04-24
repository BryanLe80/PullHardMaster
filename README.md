# PullHard - Climbing Session Tracker

PullHard is a comprehensive web application designed to help climbers track their sessions, monitor weather conditions, and improve their climbing performance. Built with React, TypeScript, and TailwindCSS, it offers a modern and intuitive interface for both indoor and outdoor climbing enthusiasts.

## Features

### 🏃‍♂️ Session Management
- **Session Tracking**: Log and manage climbing sessions with detailed information
- **Energy Level Monitoring**: Track energy levels and session quality
- **Climb Recording**: Document individual climbs within sessions
- **Notes & Photos**: Add notes and photos to document your progress
- **Calendar View**: Visualize your climbing history with an interactive calendar
- **Music Integration**: Enhance climbing sessions with real-time Spotify integration, allowing climbers to control their music playback and manage playlists directly within the active session timer

### 🌤️ Weather Integration
- **Smart Weather Analysis**: Get climbing condition recommendations based on:
  - Temperature analysis (optimal range: 50-60°F)
  - Precipitation forecasting
  - Humidity monitoring
  - Weather condition assessment
- **Location-Based Forecasts**: Weather data for popular climbing locations
- **7-Day Forecasts**: Plan your climbing sessions with weekly weather predictions

### 🗺️ Route Management
- **Route Logging**: Keep track of your climbing routes
- **Grade Tracking**: Monitor your progression across different grades
- **Style Recording**: Document climbing styles (sport, trad, bouldering)
- **Photo Integration**: Attach photos to your routes

### 💪 Training Tools
- **Training Plans**: Create and follow structured training programs
- **Progress Tracking**: Monitor your improvement over time
- **Exercise Library**: Access climbing-specific exercises and drills

## Technical Stack

- **Frontend**: React with TypeScript
- **Styling**: TailwindCSS with dark mode support
- **Backend**: Supabase
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage for photos
- **Weather Data**: OpenWeather API integration
- **Music**: Spotify Web Playback SDK

## Current Progress

### ✅ Completed Features
- User authentication and profile management
- Dark/Light mode theming
- Session creation and management
- Weather analysis and forecasting
- Basic route logging
- Calendar view of climbing history
- Energy and quality tracking
- Basic training page structure
- Spotify music integration with session timer

### 🚧 In Development
- Enhanced photo management for routes
- Advanced training plan features
- Social features and sharing
- Mobile responsiveness improvements
- Performance optimizations

### 📋 Planned Features
- Integration with popular climbing apps
- Advanced analytics and progress visualization
- Community features and beta sharing
- Gear tracking and maintenance logs
- Training video integration

## Getting Started

1. Clone the repository
```bash
git clone [repository-url]
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENWEATHER_API_KEY=your_openweather_api_key
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id
```

4. Start the development server
```bash
npm run dev
```

## Contributing

We welcome contributions! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Weather data provided by OpenWeather API
- Music integration powered by Spotify
- Icons by Lucide Icons
- UI components inspired by Tailwind UI 