import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  },
  db: {
    schema: 'public',
  },
});

// Type for climbing session
export type ClimbingSession = {
  id: string;
  user_id: string;
  location: string;
  energy_level: number;
  session_quality: number;
  notes?: string | null;
  date: string;
  created_at: string;
  climbs?: Climb[];
};

export type Climb = {
  id: string;
  session_id: string;
  grade: string;
  style: string;
  attempts: number;
  completed: boolean;
  notes?: string | null;
  created_at: string;
};