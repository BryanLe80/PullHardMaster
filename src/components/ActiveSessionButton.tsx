import React, { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { ClimbingSession } from '../lib/supabase';

export function ActiveSessionButton() {
  const [activeSession, setActiveSession] = useState<ClimbingSession | null>(null);
  const location = useLocation();

  useEffect(() => {
    // Check immediately when component mounts
    checkForActiveSession();

    // Then check every 5 seconds
    const intervalId = setInterval(checkForActiveSession, 5000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  const checkForActiveSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // First check if there's an active session in localStorage
      const allStorageKeys = Object.keys(localStorage);
      const sessionStartKeys = allStorageKeys.filter(key => key.startsWith('session_start_'));
      
      if (sessionStartKeys.length === 0) {
        setActiveSession(null);
        return;
      }

      // Get the most recent session start time
      const mostRecentSessionId = sessionStartKeys[0].replace('session_start_', '');
      
      // Fetch the session details from Supabase
      const { data, error } = await supabase
        .from('climbing_sessions')
        .select('*')
        .eq('id', mostRecentSessionId)
        .single();

      if (error) throw error;
      
      if (data) {
        // Check if the session is from today
        if (new Date(data.date).toDateString() === new Date().toDateString()) {
          setActiveSession(data);
        } else {
          setActiveSession(null);
        }
      }
    } catch (err) {
      console.error('Error checking for active session:', err);
      setActiveSession(null);
    }
  };

  // Don't show the button if we're already on the active session page
  if (!activeSession || location.pathname === `/session/${activeSession.id}`) return null;

  return (
    <Link
      to={`/session/${activeSession.id}`}
      className="fixed bottom-6 right-6 bg-indigo-600 text-white rounded-full p-4 shadow-lg hover:bg-indigo-700 transition-colors z-50 flex items-center space-x-2"
    >
      <Timer className="h-5 w-5" />
      <span className="font-medium">Active Session</span>
    </Link>
  );
} 