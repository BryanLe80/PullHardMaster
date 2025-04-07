import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { ClimbingSession } from '../lib/supabase';

export function ActiveSessionButton() {
  const [activeSession, setActiveSession] = useState<ClimbingSession | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const getUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error getting user:', error);
      return null;
    }
    return user;
  };

  const checkForActiveSession = async () => {
    try {
      const user = await getUser();
      if (!user) {
        console.log('No user found');
        setActiveSession(null);
        return;
      }

      console.log('Checking for active session for user:', user.id);

      // Check the database for active sessions
      const { data, error } = await supabase
        .from('climbing_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('date', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching active session:', error);
        setActiveSession(null);
        return;
      }

      if (data && data.length > 0) {
        const session = data[0];
        console.log('Found active session:', session);
        setActiveSession(session);
        // Store in localStorage for quick access
        localStorage.setItem('activeSession', JSON.stringify(session));
      } else {
        console.log('No active session found');
        setActiveSession(null);
        localStorage.removeItem('activeSession');
      }
    } catch (error) {
      console.error('Error checking for active session:', error);
      setActiveSession(null);
    }
  };

  // Check for active session on mount and periodically
  useEffect(() => {
    // Initial check
    checkForActiveSession();

    // Set up periodic checks every 10 seconds
    const intervalId = setInterval(checkForActiveSession, 10000);

    // Listen for session end event
    const handleSessionEnded = () => {
      console.log('Session ended event received');
      setActiveSession(null);
      localStorage.removeItem('activeSession');
    };

    window.addEventListener('sessionEnded', handleSessionEnded);

    // Cleanup
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('sessionEnded', handleSessionEnded);
    };
  }, []);

  // Don't show the button if we're already on the active session page
  if (location.pathname.startsWith('/session/')) {
    return null;
  }

  if (!activeSession) {
    return null;
  }

  return (
    <button
      onClick={() => {
        console.log('Navigating to session:', activeSession.id);
        navigate(`/session/${activeSession.id}`);
      }}
      className="fixed bottom-4 right-4 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full shadow-lg transition-colors duration-200 flex items-center gap-2"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
      </svg>
      Return to Active Session
    </button>
  );
} 