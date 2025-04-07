import React, { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { ClimbingSession } from '../lib/supabase';

export function ActiveSessionButton() {
  const [activeSession, setActiveSession] = useState<ClimbingSession | null>(null);
  const location = useLocation();

  // Function to check for active session
  const checkForActiveSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found');
        return;
      }

      // First check localStorage for active session
      const storedSession = localStorage.getItem('activeSession');
      if (storedSession) {
        const session = JSON.parse(storedSession);
        const sessionEndTime = new Date(session.endTime).getTime();
        const now = new Date().getTime();
        
        if (now < sessionEndTime) {
          console.log('Found active session in localStorage');
          setActiveSession(session);
          return;
        } else {
          // Session has expired, remove it
          localStorage.removeItem('activeSession');
        }
      }

      // If no active session in localStorage, check the database
      const { data, error } = await supabase
        .from('climbing_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No active session found, which is fine
          console.log('No active session found in database');
          setActiveSession(null);
          return;
        }
        throw error;
      }

      if (data) {
        console.log('Found active session in database');
        setActiveSession(data);
      } else {
        console.log('No active session found');
        setActiveSession(null);
      }
    } catch (error) {
      console.error('Error checking for active session:', error);
      // Don't set activeSession to null on error, just log it
    }
  };

  // Listen for session start events
  useEffect(() => {
    const handleSessionStart = (event: StorageEvent) => {
      if (event.key?.startsWith('session_start_')) {
        checkForActiveSession();
      }
    };

    window.addEventListener('storage', handleSessionStart);
    return () => window.removeEventListener('storage', handleSessionStart);
  }, []);

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