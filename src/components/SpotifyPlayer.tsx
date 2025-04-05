import React, { useState, useEffect } from 'react';
import { Music, Play, Pause, SkipForward, SkipBack, Volume2, ListMusic, Loader, Volume1, VolumeX } from 'lucide-react';

type SpotifyPlayerProps = {
  accessToken: string;
};

type SpotifyTrack = {
  id: string;
  name: string;
  uri: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
};

type SpotifyPlaylist = {
  id: string;
  name: string;
  images: { url: string }[];
  uri: string;
};

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: (() => void) | null;
    Spotify: {
      Player: new (config: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume: number;
      }) => any;
    };
  }
}

interface WebPlaybackError {
  message: string;
}

interface WebPlaybackReady {
  device_id: string;
}

interface WebPlaybackState {
  track_window: {
    current_track: SpotifyTrack;
  };
  paused: boolean;
}

export function SpotifyPlayer({ accessToken }: SpotifyPlayerProps) {
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [player, setPlayer] = useState<any>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isSDKReady, setIsSDKReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [volume, setVolume] = useState(50);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(50);

  // Load Spotify SDK script
  useEffect(() => {
    // Cleanup any existing player instances first
    const cleanupExistingPlayers = () => {
      const existingScript = document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]');
      if (existingScript) {
        console.log('Removing existing Spotify SDK script...');
        document.body.removeChild(existingScript);
      }
      
      // Reset any existing player state
      if (window.Spotify?.Player) {
        console.log('Cleaning up existing Spotify player...');
        const existingPlayer = new window.Spotify.Player({
          name: 'Cleanup Player',
          getOAuthToken: () => {},
          volume: 0
        });
        existingPlayer.disconnect();
      }
    };

    // Run cleanup before initializing new player
    cleanupExistingPlayers();

    // Suppress Spotify SDK errors
    const originalError = console.error;
    console.error = (...args) => {
      // Filter out known non-critical errors
      if (
        args[0]?.includes?.('cpapi.spotify.com') || // Filter cloud playback API errors
        args[0]?.toString?.()?.includes?.('PlayLoad event failed') || // Filter PlayLoad errors
        (args[0] instanceof Error && args[0].message?.includes?.('PlayLoad event failed')) // Filter error objects
      ) {
        return; // Suppress these errors
      }
      originalError.apply(console, args);
    };

    // Load the script with HTTPS
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    script.crossOrigin = 'anonymous'; // Add CORS header

    // Define the callback before loading the script
    window.onSpotifyWebPlaybackSDKReady = () => {
      setIsSDKReady(true);
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup
      cleanupExistingPlayers();
      document.body.removeChild(script);
      window.onSpotifyWebPlaybackSDKReady = null;
      console.error = originalError;
    };
  }, []);

  // Initialize player when SDK is ready
  useEffect(() => {
    if (!isSDKReady || !accessToken) return;

    // Define the handler at the top level of the effect
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (
        event.reason?.message?.includes?.('PlayLoad event failed') ||
        event.reason?.toString?.()?.includes?.('PlayLoad event failed')
      ) {
        event.preventDefault(); // Prevent the error from appearing in console
      }
    };

    // Add the handler
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    const initializePlayer = async () => {
      try {
        // First validate the token and check for Premium
        const response = await fetch('https://api.spotify.com/v1/me', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to validate Spotify token');
        }

        const data = await response.json();
        if (data.product !== 'premium') {
          setError('Spotify Premium is required to use the player.');
          setIsInitializing(false);
          return;
        }

        // If token is valid and user has Premium, initialize the player
        const player = new window.Spotify.Player({
          name: 'PullHard Web Player',
          getOAuthToken: (cb: (token: string) => void) => {
            const currentToken = localStorage.getItem('spotify_access_token');
            if (currentToken) {
              cb(currentToken);
            } else {
              setError('Spotify token expired. Please reconnect.');
            }
          },
          volume: volume / 100
        });

        // Handle Ready
        player.addListener('ready', async ({ device_id }: WebPlaybackReady) => {
          console.log('Ready with Device ID', device_id);
          setDeviceId(device_id);
          setIsInitializing(false);
          setError(null);

          try {
            // Get all available devices first
            const devicesResponse = await fetch('https://api.spotify.com/v1/me/player/devices', {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            });

            if (!devicesResponse.ok) {
              throw new Error('Failed to get devices');
            }

            // Then set this device as active
            const transferResponse = await fetch('https://api.spotify.com/v1/me/player', {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                device_ids: [device_id],
                play: false,
              }),
            });

            if (!transferResponse.ok && transferResponse.status !== 204) {
              throw new Error('Failed to set active device');
            }

            // Get current playback state
            const stateResponse = await fetch('https://api.spotify.com/v1/me/player', {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            });

            if (stateResponse.ok && stateResponse.status !== 204) {
              const state = await stateResponse.json();
              if (state.item) {
                setCurrentTrack(state.item);
                setIsPlaying(!state.is_playing);
              }
            }

            console.log('Successfully activated device');
          } catch (err) {
            console.error('Error during device activation:', err);
            // Don't set error here, just log it - the player might still work
          }
        });

        // Other event listeners...
        player.addListener('not_ready', ({ device_id }: WebPlaybackReady) => {
          console.log('Device ID has gone offline', device_id);
          setDeviceId(null);
        });

        player.addListener('player_state_changed', (state: WebPlaybackState | null) => {
          if (state) {
            setCurrentTrack(state.track_window.current_track);
            setIsPlaying(!state.paused);
          }
        });

        player.addListener('initialization_error', ({ message }: WebPlaybackError) => {
          console.error('Failed to initialize:', message);
          // Try to reconnect once
          player.connect().catch(() => {
            setError('Failed to initialize player. Please refresh the page.');
            setIsInitializing(false);
          });
        });

        player.addListener('authentication_error', ({ message }: WebPlaybackError) => {
          console.error('Failed to authenticate:', message);
          localStorage.removeItem('spotify_access_token');
          setError('Authentication failed. Please reconnect to Spotify.');
          setIsInitializing(false);
        });

        player.addListener('account_error', ({ message }: WebPlaybackError) => {
          console.error('Failed to validate Spotify account:', message);
          setError('Spotify Premium is required for playback.');
          setIsInitializing(false);
        });

        // Connect to the player
        const success = await player.connect();
        if (success) {
          setPlayer(player);
          setError(null);
        } else {
          throw new Error('Failed to connect to Spotify player');
        }

      } catch (err) {
        console.error('Error initializing player:', err);
        setError('Failed to initialize Spotify player. Please refresh the page.');
        setIsInitializing(false);
      }
    };

    initializePlayer();

    // Cleanup function
    return () => {
      if (player) {
        console.log('Disconnecting Spotify player...');
        player.disconnect();
        setPlayer(null);
        setDeviceId(null);
        setCurrentTrack(null);
        setIsPlaying(false);
      }
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [accessToken, isSDKReady]);

  // Add effect to handle session end
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (player) {
        console.log('Disconnecting Spotify player before unload...');
        player.disconnect();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [player]);

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=20', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch playlists');
        }

        const data = await response.json();
        setPlaylists(data.items);
      } catch (err) {
        console.error('Error fetching playlists:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch playlists');
      }
    };

    fetchPlaylists();
  }, [accessToken]);

  useEffect(() => {
    if (player && isSDKReady) {
      player.setVolume(volume / 100);
    }
  }, [volume, player, isSDKReady]);

  // Handle volume changes
  const handleVolumeChange = async (newVolume: number) => {
    setVolume(newVolume);
    if (player) {
      try {
        await player.setVolume(newVolume / 100);
      } catch (err) {
        console.error('Error updating volume:', err);
      }
    }
  };

  // Handle play/pause
  const handlePlayPause = async () => {
    if (!player) return;

    try {
      if (isPlaying) {
        await player.pause();
      } else {
        await player.resume();
      }
      setIsPlaying(!isPlaying);
    } catch (err) {
      console.error('Error controlling playback:', err);
      setError('Failed to control playback. Please try again.');
    }
  };

  // Handle next/previous
  const handleSkip = async (direction: 'next' | 'previous') => {
    if (!player) return;

    try {
      if (direction === 'next') {
        await player.nextTrack();
      } else {
        await player.previousTrack();
      }
    } catch (err) {
      console.error(`Error skipping ${direction}:`, err);
      setError(`Failed to skip ${direction}. Please try again.`);
    }
  };

  const handlePlayPlaylist = async (playlistUri: string) => {
    try {
      if (!player || !deviceId || !isSDKReady) {
        throw new Error('Please wait for Spotify player to initialize');
      }

      await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_ids: [deviceId],
          play: false,
        }),
      });

      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context_uri: playlistUri,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 403) {
          throw new Error('Premium account required for this feature');
        } else if (response.status === 401) {
          throw new Error('Session expired. Please reconnect to Spotify');
        } else {
          throw new Error(`Failed to play playlist: ${errorText}`);
        }
      }

      setIsPlaying(true);
      setShowPlaylists(false);
      setError(null);
    } catch (err) {
      console.error('Error playing playlist:', err);
      setError(err instanceof Error ? err.message : 'Failed to play playlist');
    }
  };

  const handleVolumeClick = () => {
    if (volume > 0) {
      setPreviousVolume(volume);
      setVolume(0);
    } else {
      setVolume(previousVolume);
    }
  };

  const getVolumeIcon = () => {
    if (volume === 0) return <VolumeX className="h-5 w-5" />;
    if (volume < 50) return <Volume1 className="h-5 w-5" />;
    return <Volume2 className="h-5 w-5" />;
  };

  if (isInitializing) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="animate-spin">
            <Loader className="h-8 w-8 text-indigo-600" />
          </div>
          <p className="text-sm text-gray-600">
            Initializing Spotify Player...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg">
        <p className="text-sm text-red-600">Error: {error}</p>
        {error.includes('Premium') && (
          <p className="text-sm text-red-600 mt-2">
            Spotify Web Playback requires a Premium account.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-4">
        <div className="flex items-center space-x-4">
          {currentTrack?.album.images[0] && (
            <img
              src={currentTrack.album.images[0].url}
              alt={currentTrack.album.name}
              className="w-16 h-16 rounded-md"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {currentTrack?.name || 'No track playing'}
            </h3>
            {currentTrack && (
              <p className="text-sm text-gray-500 truncate">
                {currentTrack.artists.map(artist => artist.name).join(', ')}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleSkip('previous')}
              className="p-2 text-gray-400 hover:text-gray-600"
              disabled={!isSDKReady || !currentTrack}
            >
              <SkipBack className="h-5 w-5" />
            </button>
            <button
              onClick={handlePlayPause}
              className="p-2 text-gray-400 hover:text-gray-600"
              disabled={!isSDKReady}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={() => handleSkip('next')}
              className="p-2 text-gray-400 hover:text-gray-600"
              disabled={!isSDKReady || !currentTrack}
            >
              <SkipForward className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowPlaylists(!showPlaylists)}
              className="p-2 text-gray-400 hover:text-gray-600"
              disabled={!isSDKReady}
            >
              <ListMusic className="h-5 w-5" />
            </button>
            <div className="relative">
              <button
                onClick={handleVolumeClick}
                onMouseEnter={() => setShowVolumeSlider(true)}
                className="p-2 text-gray-400 hover:text-gray-600"
                disabled={!isSDKReady}
              >
                {getVolumeIcon()}
              </button>
              {showVolumeSlider && (
                <div 
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full mb-2 p-2 bg-white shadow-lg rounded-lg"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showPlaylists && (
        <div className="border-t border-gray-200 max-h-64 overflow-y-auto">
          <div className="p-2">
            <h4 className="text-sm font-medium text-gray-900 px-2 py-1">
              Your Playlists
            </h4>
            {playlists.map(playlist => (
              <button
                key={playlist.id}
                onClick={() => handlePlayPlaylist(playlist.uri)}
                className="w-full text-left px-2 py-2 hover:bg-gray-50 rounded-md flex items-center space-x-3"
                disabled={!isSDKReady}
              >
                {playlist.images[0] && (
                  <img
                    src={playlist.images[0].url}
                    alt={playlist.name}
                    className="w-8 h-8 rounded"
                  />
                )}
                <span className="text-sm text-gray-700 truncate">
                  {playlist.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}