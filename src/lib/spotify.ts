import { generateRandomString } from './utils';

const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
// Use environment variable for redirect URI or fallback to current origin
const SPOTIFY_REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || `${window.location.origin}/spotify-callback.html`;
const STATE_KEY = 'spotify_auth_state';

// Log the redirect URI in development
if (import.meta.env.DEV) {
  console.log('Spotify Redirect URI:', SPOTIFY_REDIRECT_URI);
}

export function initiateSpotifyAuth() {
  console.log('Initiating Spotify auth with client ID:', SPOTIFY_CLIENT_ID);
  console.log('Redirect URI:', SPOTIFY_REDIRECT_URI);

  if (!SPOTIFY_CLIENT_ID) {
    console.error('Spotify Client ID is missing in environment variables');
    throw new Error('Spotify Client ID is not configured');
  }

  // Clear any existing tokens and state before starting new flow
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem(STATE_KEY);

  // Generate and store state
  const state = generateRandomString(16);
  localStorage.setItem(STATE_KEY, state);

  const scope = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'playlist-read-private',
    'app-remote-control'
  ].join(' ');

  const params = new URLSearchParams({
    response_type: 'token',
    client_id: SPOTIFY_CLIENT_ID,
    scope: scope,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    state: state,
    show_dialog: 'true'
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
  console.log('Opening Spotify auth URL in new window:', authUrl);
  
  // Open auth in a popup window
  const width = 500;
  const height = 700;
  const left = (window.screen.width / 2) - (width / 2);
  const top = (window.screen.height / 2) - (height / 2);

  const authWindow = window.open(
    authUrl,
    'Spotify Login',
    `width=${width},height=${height},left=${left},top=${top}`
  );

  // Set up message listener for the popup response
  window.addEventListener('message', function handleSpotifyCallback(event) {
    // Only handle messages from our popup
    if (event.origin !== window.location.origin) {
      console.log('Ignoring message from different origin:', event.origin);
      return;
    }

    // Check if this is our Spotify callback
    if (event.data.type === 'SPOTIFY_CALLBACK') {
      console.log('Received Spotify callback in parent window:', event.data);
      
      // Store the token if provided
      if (event.data.accessToken) {
        const storedState = localStorage.getItem(STATE_KEY);
        if (event.data.state === storedState) {
          localStorage.setItem('spotify_access_token', event.data.accessToken);
          console.log('Successfully stored Spotify access token');
        } else {
          console.error('State mismatch in callback');
        }
      }

      window.removeEventListener('message', handleSpotifyCallback);
      if (authWindow) {
        authWindow.close();
      }
    }
  });
}

export function handleSpotifyCallback(): { 
  accessToken: string | null;
  error: string | null;
} {
  console.log('Handling Spotify callback, current URL:', window.location.href);
  
  if (!window.location.hash) {
    console.log('No hash found in URL');
    return { accessToken: null, error: null };
  }

  try {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = params.get('access_token');
    const state = params.get('state');
    const storedState = localStorage.getItem(STATE_KEY);
    const error = params.get('error');

    console.log('Callback parameters:', {
      hasAccessToken: !!accessToken,
      hasState: !!state,
      hasStoredState: !!storedState,
      error
    });

    // Always clear state after getting it
    localStorage.removeItem(STATE_KEY);

    if (error) {
      console.error('Spotify auth error:', error);
      localStorage.removeItem('spotify_access_token');
      return { accessToken: null, error };
    }

    if (!accessToken) {
      console.error('No access token in callback');
      return { accessToken: null, error: 'No access token received' };
    }

    if (!state || state !== storedState) {
      console.error('State mismatch:', { received: state, stored: storedState });
      localStorage.removeItem('spotify_access_token');
      return { accessToken: null, error: 'State mismatch' };
    }

    // Store the token
    localStorage.setItem('spotify_access_token', accessToken);
    console.log('Successfully stored Spotify access token');

    return { accessToken, error: null };
  } catch (err) {
    console.error('Error handling Spotify callback:', err);
    return { accessToken: null, error: 'Failed to process callback' };
  }
}

export async function validateSpotifyToken(token: string): Promise<boolean> {
  if (!token) {
    return false;
  }

  try {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.ok;
  } catch (err) {
    console.error('Error validating Spotify token:', err);
    return false;
  }
}