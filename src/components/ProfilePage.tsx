import React, { useEffect, useState } from 'react';
import { Music } from 'lucide-react';
import { initiateSpotifyAuth, validateSpotifyToken } from '../lib/spotify';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface ProfilePageProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export function ProfilePage({ isDarkMode, toggleDarkMode }: ProfilePageProps) {
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

  // Handle token validation and storage
  const handleTokenValidation = async (token: string) => {
    try {
      setIsProcessingAuth(true);
      setError(null);
      
      // Validate the token
      const isValid = await validateSpotifyToken(token);
      
      if (isValid) {
        console.log('Token is valid');
        // Ensure the token is stored
        localStorage.setItem('spotify_access_token', token);
        setSpotifyConnected(true);
        
        // Refresh the Supabase session to ensure auth state is preserved
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token
          });
        }
      } else {
        console.log('Token is invalid');
        clearSpotifyStorage();
      }
    } catch (err) {
      console.error('Error validating token:', err);
      clearSpotifyStorage();
      setError(err instanceof Error ? err.message : 'Failed to validate token');
    } finally {
      setIsProcessingAuth(false);
    }
  };

  // Handle Spotify connection
  useEffect(() => {
    // Check for stored token
    const storedToken = localStorage.getItem('spotify_access_token');
    if (storedToken) {
      handleTokenValidation(storedToken);
    } else {
      // If no stored token, check existing connection
      checkSpotifyConnection();
    }

    // Listen for Spotify auth completion from popup
    const handleMessage = async (event: MessageEvent) => {
      // Verify the message origin
      if (event.origin !== window.location.origin) {
        console.log('Message received from different origin:', event.origin);
        return;
      }
      
      if (event.data.type === 'SPOTIFY_CALLBACK') {
        console.log('Received Spotify callback message:', event.data);
        
        if (event.data.accessToken) {
          // Store the token immediately
          localStorage.setItem('spotify_access_token', event.data.accessToken);
          localStorage.setItem('spotify_auth_state', event.data.state);
          
          // Validate the token
          await handleTokenValidation(event.data.accessToken);
          
          // Force a re-render of the auth state
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            // Update the session to ensure auth state is preserved
            await supabase.auth.setSession({
              access_token: session.access_token,
              refresh_token: session.refresh_token
            });
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Profile</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage your account settings and connections
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <div className="text-sm text-red-700 dark:text-red-300">
            Error connecting to Spotify: {error}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Connected Services</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Music className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Spotify</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
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