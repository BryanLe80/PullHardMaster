import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Link, useLocation, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Mountain, Plus, LogIn, ClipboardList, Battery, Star, Cloud, Dumbbell, Map, LogOut, User, Timer } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from './components/Calendar';
import { NewSessionModal } from './components/NewSessionModal';
import { SessionTimer } from './components/SessionTimer';
import { SessionsPage } from './components/SessionsPage';
import { WeatherPage } from './components/WeatherPage';
import { TrainingPage } from './components/TrainingPage';
import { ProfilePage } from './components/ProfilePage';
import { RoutesPage } from './components/RoutesPage';
import type { ClimbingSession } from './lib/supabase';
import { handleSpotifyCallback } from './lib/spotify';
import { User as SupabaseUser } from '@supabase/supabase-js';

function Dashboard() {
  const [sessions, setSessions] = useState<ClimbingSession[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showNewSession, setShowNewSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    fetchSessions();
    fetchUser();
  }, []);

  async function fetchUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  }

  async function fetchSessions() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('Fetching sessions for user:', user.id);

      const { data, error } = await supabase
        .from('climbing_sessions')
        .select(`
          *,
          climbs (*)
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Fetched sessions:', data);
      setSessions(data || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during session fetching');
    } finally {
      setLoading(false);
    }
  }

  function getQualityColor(quality: number): string {
    switch (quality) {
      case 1: return 'bg-red-100 text-red-800';
      case 2: return 'bg-orange-100 text-orange-800';
      case 3: return 'bg-yellow-100 text-yellow-800';
      case 4: return 'bg-lime-100 text-lime-800';
      case 5: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  const existingLocations = sessions.map(session => session.location);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 mb-4">
        <div className="text-sm text-red-700">Error loading sessions: {error}</div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Hello {user?.email?.split('@')[0]}!</h1>
        <button
          onClick={() => setShowNewSession(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Session
        </button>
      </div>

      <Calendar
        sessions={sessions}
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
      />

      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Sessions</h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {sessions.length === 0 ? (
            <div className="px-6 py-4 text-center text-gray-500">
              No climbing sessions yet. Start by creating a new session!
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {sessions.map((session) => (
                <li key={session.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {session.location}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {format(new Date(session.date), 'PPP')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Battery className="h-4 w-4 text-gray-400" />
                          <span className={`px-2 py-1 rounded text-sm ${getQualityColor(session.energy_level)}`}>
                            Energy: {session.energy_level}/5
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Star className="h-4 w-4 text-gray-400" />
                          <span className={`px-2 py-1 rounded text-sm ${getQualityColor(session.session_quality)}`}>
                            Quality: {session.session_quality}/5
                          </span>
                        </div>
                      </div>
                    </div>
                    {session.notes && (
                      <p className="text-sm text-gray-600">{session.notes}</p>
                    )}
                    <div className="text-sm text-gray-500">
                      {session.climbs?.length || 0} climbs recorded
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {showNewSession && (
        <NewSessionModal
          onClose={() => setShowNewSession(false)}
          onSuccess={fetchSessions}
          existingLocations={existingLocations}
        />
      )}
    </>
  );
}

function App() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we're in an active session
  const isActiveSession = location.pathname.startsWith('/session/');

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
        }
        // No automatic redirects here - let the router handle access control
      } catch (err) {
        console.error('Error checking auth status:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      // No automatic redirects here either
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        });
        if (error) throw error;
        setError('Check your email for the confirmation link.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during authentication');
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error.message);
    // Only redirect to home on explicit sign out
    navigate('/');
    setShowSignOutConfirm(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <Mountain className="h-8 w-8 text-indigo-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">PullHard</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {(user || window.location.hash) && (
                <>
                  {isActiveSession && (
                    <Link
                      to={location.pathname}
                      className="flex items-center text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full"
                    >
                      <Timer className="h-4 w-4 mr-1" />
                      <span>Active Session</span>
                    </Link>
                  )}
                  <Link
                    to="/weather"
                    className="flex items-center text-gray-600 hover:text-gray-900"
                  >
                    <Cloud className="h-5 w-5 mr-1" />
                    <span>Weather</span>
                  </Link>
                  <Link
                    to="/sessions"
                    className="flex items-center text-gray-600 hover:text-gray-900"
                  >
                    <ClipboardList className="h-5 w-5 mr-1" />
                    <span>Sessions</span>
                  </Link>
                  <Link
                    to="/routes"
                    className="flex items-center text-gray-600 hover:text-gray-900"
                  >
                    <Map className="h-5 w-5 mr-1" />
                    <span>Routes</span>
                  </Link>
                  <Link
                    to="/training"
                    className="flex items-center text-gray-600 hover:text-gray-900"
                  >
                    <Dumbbell className="h-5 w-5 mr-1" />
                    <span>Training</span>
                  </Link>
                  <Link
                    to="/profile"
                    className="flex items-center text-gray-600 hover:text-gray-900"
                  >
                    <User className="h-5 w-5 mr-1" />
                    <span>Profile</span>
                  </Link>
                  <button
                    onClick={() => setShowSignOutConfirm(true)}
                    className="flex items-center text-red-600 hover:text-red-700"
                  >
                    <LogOut className="h-5 w-5 mr-1" />
                    <span>Sign Out</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {showSignOutConfirm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="relative bg-white rounded-lg max-w-sm w-full p-6 z-50">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Are you sure you want to sign out?
            </h3>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={signOut}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : user || window.location.hash ? (
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/session/:sessionId" element={<SessionTimer />} />
            <Route path="/sessions" element={<SessionsPage />} />
            <Route path="/weather" element={<WeatherPage />} />
            <Route path="/routes" element={<RoutesPage />} />
            <Route path="/training" element={<TrainingPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        ) : location.pathname === '/' ? (
          <div className="flex min-h-[calc(100vh-4rem)] flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
              <Mountain className="mx-auto h-12 w-12 text-indigo-600" />
              <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
                {isSignUp ? 'Create your account' : 'Sign in to your account'}
              </h2>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
              <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                <form className="space-y-6" onSubmit={handleAuth}>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email address
                    </label>
                    <div className="mt-1">
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <div className="mt-1">
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete={isSignUp ? 'new-password' : 'current-password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-md bg-red-50 p-4">
                      <div className="text-sm text-red-700">{error}</div>
                    </div>
                  )}

                  <div>
                    <button
                      type="submit"
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      {isSignUp ? 'Sign up' : 'Sign in'}
                    </button>
                  </div>

                  <div className="text-sm text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(!isSignUp);
                        setError('');
                      }}
                      className="font-medium text-indigo-600 hover:text-indigo-500"
                    >
                      {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <Navigate to="/" replace />
        )}
      </main>
    </div>
  );
}

export default App;