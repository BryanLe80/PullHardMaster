import React, { useState, useEffect } from 'react';
import { Music, Play, Pause, SkipForward, SkipBack, Volume2, ListMusic, Loader, Volume1, VolumeX } from 'lucide-react';

// Add Spotify type definition
declare global {
  interface Window {
    Spotify: {
      Player: new (config: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume: number;
      }) => {
        connect: () => Promise<boolean>;
        disconnect: () => Promise<void>;
        addListener: (event: string, callback: (data: any) => void) => void;
      };
    };
    onSpotifyWebPlaybackSDKReady: (() => void) | null;
  }
}

interface SpotifyPlayerProps {
  accessToken: string;
  onError?: (error: string) => void;
}

type SpotifyTrack = {
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  duration_ms: number;
  id: string;
  uri: string;
};

type SpotifyPlaylist = {
  id: string;
  name: string;
  images: { url: string }[];
  uri: string;
};

interface WebPlaybackError {
  message: string;
}

interface WebPlaybackReady {
  device_id: string;
}

interface WebPlaybackState {
  track_window: {
    current_track: {
      name: string;
      artists: Array<{ name: string }>;
      album: {
        name: string;
        images: Array<{ url: string }>;
      };
      duration_ms: number;
      uri: string;
    };
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
      // Safely remove existing script
      const existingScript = document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]');
      if (existingScript && existingScript.parentNode) {
        console.log('Removing existing Spotify SDK script...');
        existingScript.parentNode.removeChild(existingScript);
      }
      
      // Reset any existing player state
      if (window.Spotify?.Player) {
        console.log('Cleaning up existing Spotify player...');
        try {
          // Create a temporary player instance to disconnect
          const existingPlayer = new window.Spotify.Player({
            name: 'Cleanup Player',
            getOAuthToken: () => {},
            volume: 0
          });
          
          // Ensure the player is properly disconnected
          existingPlayer.disconnect().then(() => {
            console.log('Successfully disconnected existing player');
          }).catch((err: Error) => {
            console.log('Error during player disconnect:', err);
          });
          
          // Clear any stored player state
          localStorage.removeItem('spotify-player-state');
        } catch (err) {
          console.log('Error during player cleanup:', err);
        }
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
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      window.onSpotifyWebPlaybackSDKReady = null;
      console.error = originalError;
    };
  }, []);

  // Initialize Spotify player
  useEffect(() => {
    if (!isSDKReady || !accessToken) return;

    const initializePlayer = async () => {
      try {
        console.log('Starting player initialization...');
        
        // Cleanup any existing player first
        if (player) {
          console.log('Disconnecting existing player before initialization...');
          await player.disconnect();
        }

        console.log('Creating new player instance...');
        const newPlayer = new window.Spotify.Player({
          name: 'PullHard Web Player',
          getOAuthToken: cb => {
            console.log('Getting OAuth token...');
            cb(accessToken);
          },
          volume: 0.5
        });

        // Ready
        newPlayer.addListener('ready', async ({ device_id }: { device_id: string }) => {
          console.log('Player is ready with Device ID:', device_id);
          setDeviceId(device_id);
          setError(null);
          setIsInitializing(false);
          
          try {
            // First ensure we're the active device
            const transferResponse = await fetch('https://api.spotify.com/v1/me/player', {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                device_ids: [device_id],
                play: false
              }),
            });

            if (!transferResponse.ok) {
              throw new Error('Failed to transfer playback to this device');
            }

            // Wait a moment for the transfer to complete
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Get current playback state
            const stateResponse = await fetch('https://api.spotify.com/v1/me/player', {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            });

            if (!stateResponse.ok) {
              console.warn('Failed to get player state, but continuing...');
              return;
            }

            const state = await stateResponse.json();
            
            // Only load default playlist if no content is currently playing
            if (!state || !state.item) {
              console.log('No content playing, loading default playlist...');
              const playResponse = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${device_id}`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  context_uri: 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M', // Default playlist
                }),
              });

              if (!playResponse.ok) {
                console.warn('Failed to load default playlist, but continuing...');
                return;
              }

              // Wait for playlist to load
              await new Promise(resolve => setTimeout(resolve, 2000));

              // Pause playback after loading
              await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${device_id}`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                },
              });
            } else {
              console.log('Content already playing, skipping default playlist load');
            }
          } catch (err) {
            console.error('Error during device transfer:', err);
            setError('Failed to initialize playback. Please try again.');
          }
        });

        // Playback status updates
        newPlayer.addListener('player_state_changed', (state: WebPlaybackState | null) => {
          if (!state) {
            console.log('No player state available');
            return;
          }
          const track = state.track_window.current_track;
          if (!track) {
            console.log('No current track available');
            return;
          }
          setCurrentTrack({
            ...track,
            id: track.uri.split(':')[2],
            uri: track.uri
          });
          setIsPlaying(!state.paused);
        });

        // Error handling
        newPlayer.addListener('initialization_error', ({ message }: { message: string }) => {
          console.error('Failed to initialize:', message);
          setError('Failed to initialize player. Please refresh the page.');
          setIsInitializing(false);
        });

        newPlayer.addListener('authentication_error', ({ message }: { message: string }) => {
          console.error('Failed to authenticate:', message);
          setError('Authentication failed. Please reconnect to Spotify.');
          setIsInitializing(false);
        });

        newPlayer.addListener('account_error', ({ message }: { message: string }) => {
          console.error('Failed to validate Spotify account:', message);
          setError('Spotify Premium is required for playback.');
          setIsInitializing(false);
        });

        newPlayer.addListener('playback_error', ({ message }: { message: string }) => {
          console.error('Failed to perform playback:', message);
          setError('Playback error. Please try again.');
          setIsInitializing(false);
        });

        // Not Ready
        newPlayer.addListener('not_ready', ({ device_id }: { device_id: string }) => {
          console.log('Device ID has gone offline:', device_id);
          setDeviceId(null);
          setIsInitializing(true);
        });

        // Connect to the player
        console.log('Connecting to player...');
        const connected = await newPlayer.connect();
        if (connected) {
          console.log('Successfully connected to player');
          setPlayer(newPlayer);
        } else {
          console.error('Failed to connect to player');
          setError('Failed to connect to Spotify player. Please try again.');
        }
      } catch (error) {
        console.error('Error initializing Spotify player:', error);
        setError('Failed to initialize Spotify player. Please refresh the page.');
      }
    };

    initializePlayer();

    return () => {
      if (player) {
        console.log('Cleaning up player on unmount...');
        player.disconnect().then(() => {
          console.log('Successfully disconnected player on unmount');
        }).catch((err: Error) => {
          console.log('Error disconnecting player on unmount:', err);
        });
      }
    };
  }, [isSDKReady, accessToken]);

  // Add effect to handle session end
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (player) {
        console.log('Disconnecting Spotify player before unload...');
        try {
          await player.disconnect();
          // Clear any stored player state
          localStorage.removeItem('spotify-player-state');
          console.log('Successfully disconnected player before unload');
        } catch (err) {
          console.log('Error during player disconnect:', err);
        }
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
    if (!player || !deviceId) {
      console.log('Player or device ID not available');
      return;
    }

    try {
      // First ensure we're the active device
      const transferResponse = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_ids: [deviceId],
          play: false
        }),
      });

      if (!transferResponse.ok) {
        throw new Error('Failed to transfer playback to this device');
      }

      // Wait a moment for the transfer to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Then handle play/pause
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
    if (!player || !deviceId) {
      console.log('Player or device ID not available');
      return;
    }

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

  // Handle playlist playback
  const handlePlayPlaylist = async (playlistUri: string) => {
    if (!player || !deviceId || !isSDKReady) {
      console.log('Player not ready');
      return;
    }

    try {
      // First ensure we're the active device
      const transferResponse = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_ids: [deviceId],
          play: false
        }),
      });

      if (!transferResponse.ok) {
        throw new Error('Failed to transfer playback to this device');
      }

      // Wait a moment for the transfer to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Then play the playlist
      const playResponse = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context_uri: playlistUri,
        }),
      });

      if (!playResponse.ok) {
        const errorText = await playResponse.text();
        if (playResponse.status === 403) {
          throw new Error('Premium account required for this feature');
        } else if (playResponse.status === 401) {
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