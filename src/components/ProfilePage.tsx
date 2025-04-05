import React, { useEffect, useState } from 'react';
import { Music } from 'lucide-react';
import { initiateSpotifyAuth, handleSpotifyCallback, validateSpotifyToken } from '../lib/spotify';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function ProfilePage() {
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);
  const navigate = useNavigate();

  // Clear Spotify-related storage
  const clearSpotifyStorage = () => {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_auth_state');
    setSpotifyConnected(false);
  };

  // Check Spotify connection status
  const checkSpotifyConnection = async () => {
    try {
      setIsProcessingAuth(true);
      setError(null);

      // Check existing Spotify connection
      console.log('Checking existing Spotify connection...');
      const storedToken = localStorage.getItem('spotify_access_token');
      if (storedToken) {
        const isValid = await validateSpotifyToken(storedToken);
        setSpotifyConnected(isValid);
        if (!isValid) {
          console.log('Stored token is invalid, clearing...');
          clearSpotifyStorage();
        }
      } else {
        setSpotifyConnected(false);
      }
    } catch (err) {
      console.error('Error in Spotify connection:', err);
      clearSpotifyStorage();
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsProcessingAuth(false);
    }
  };

  // Handle Spotify connection
  useEffect(() => {
    // Check for Spotify callback
    if (window.location.hash) {
      console.log('Handling Spotify callback in ProfilePage');
      const result = handleSpotifyCallback();
      
      if (result.error) {
        console.error('Spotify auth error:', result.error);
        clearSpotifyStorage();
        setError(result.error);
        setIsProcessingAuth(false);
        return;
      }

      if (result.accessToken) {
        console.log('Spotify auth successful, validating token...');
        validateSpotifyToken(result.accessToken)
          .then(isValid => {
            if (isValid) {
              console.log('Spotify token is valid');
              setSpotifyConnected(true);
              // Clean up URL without triggering a navigation
              window.history.replaceState({}, document.title, window.location.pathname);
            } else {
              console.error('Invalid Spotify token');
              clearSpotifyStorage();
            }
          })
          .catch(err => {
            console.error('Error validating Spotify token:', err);
            clearSpotifyStorage();
          })
          .finally(() => {
            setIsProcessingAuth(false);
          });
      } else {
        setIsProcessingAuth(false);
      }
    } else {
      checkSpotifyConnection();
    }

    // Listen for Spotify auth completion
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type !== 'SPOTIFY_CALLBACK') return;

      console.log('Received Spotify callback message:', event.data);
      
      // If we have an access token in the message, validate it
      if (event.data.accessToken) {
        try {
          setIsProcessingAuth(true);
          const isValid = await validateSpotifyToken(event.data.accessToken);
          if (isValid) {
            console.log('Token from message is valid');
            setSpotifyConnected(true);
          } else {
            console.log('Token from message is invalid');
            clearSpotifyStorage();
          }
        } catch (err) {
          console.error('Error validating token from message:', err);
          clearSpotifyStorage();
        } finally {
          setIsProcessingAuth(false);
        }
      } else {
        // If no token in message, check the connection
        await checkSpotifyConnection();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleSpotifyConnect = () => {
    setError(null);
    setIsProcessingAuth(true);
    
    try {
      if (spotifyConnected) {
        clearSpotifyStorage();
        setIsProcessingAuth(false);
      } else {
        console.log('Starting Spotify connection...');
        clearSpotifyStorage();
        initiateSpotifyAuth();
      }
    } catch (err) {
      console.error('Error connecting to Spotify:', err);
      clearSpotifyStorage();
      setError(err instanceof Error ? err.message : 'Failed to connect to Spotify');
      setIsProcessingAuth(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600 mt-1">
          Manage your account settings and connections
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">
            Error connecting to Spotify: {error}
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Connected Services</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Music className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-gray-900">Spotify</p>
                <p className="text-sm text-gray-500">
                  {spotifyConnected 
                    ? 'Connected to Spotify'
                    : 'Connect to sync your climbing playlists'}
                </p>
              </div>
            </div>
            <button
              onClick={handleSpotifyConnect}
              disabled={isProcessingAuth}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                isProcessingAuth
                  ? 'bg-gray-400 cursor-not-allowed'
                  : spotifyConnected 
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isProcessingAuth
                ? 'Processing...'
                : spotifyConnected 
                  ? 'Disconnect' 
                  : 'Connect Spotify'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}