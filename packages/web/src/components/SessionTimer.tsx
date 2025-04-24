import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Timer, StopCircle, Play, Pause, RefreshCw, Map, Music } from 'lucide-react';
import { format, differenceInSeconds, addMinutes } from 'date-fns';
import { supabase } from '../lib/supabase';
import type { Route } from '../lib/types';
import { LogRouteModal } from './LogRouteModal';
import { SpotifyPlayer } from './SpotifyPlayer';

type TimerState = 'setting' | 'running' | 'paused' | 'finished';

interface ClimbingSession {
  id: string;
  location: string;
  date: string;
  energy_level: number;
  session_quality: number;
  notes?: string;
}

interface Climb {
  id: string;
  grade: string;
  style: string;
  route_name?: string;
  session_id: string;
  created_at: string;
}

export function SessionTimer() {
  const { sessionId } = useParams();
  const [elapsedTime, setElapsedTime] = useState(() => {
    const stored = localStorage.getItem(`session_start_${sessionId}`);
    if (!stored) return 0;
    return differenceInSeconds(new Date(), new Date(stored));
  });
  const [isRunning, setIsRunning] = useState(false);
  const [startTime] = useState(() => {
    const stored = localStorage.getItem(`session_start_${sessionId}`);
    return stored ? new Date(stored) : new Date();
  });
  
  const [restDuration, setRestDuration] = useState(3); // Default 3 minutes
  const [restStartTime, setRestStartTime] = useState<Date | null>(() => {
    const stored = localStorage.getItem(`rest_start_${sessionId}`);
    return stored ? new Date(stored) : null;
  });
  const [restEndTime, setRestEndTime] = useState<Date | null>(() => {
    const stored = localStorage.getItem(`rest_end_${sessionId}`);
    return stored ? new Date(stored) : null;
  });
  const [restTimeRemaining, setRestTimeRemaining] = useState(() => {
    if (!restStartTime || !restEndTime) return restDuration * 60;
    const remaining = differenceInSeconds(restEndTime, new Date());
    return remaining > 0 ? remaining : 0;
  });
  const [restTimerState, setRestTimerState] = useState<TimerState>(() => {
    if (restStartTime && restEndTime) {
      const remaining = differenceInSeconds(restEndTime, new Date());
      if (remaining <= 0) return 'finished';
      return 'running';
    }
    return 'setting';
  });
  
  const [showEndForm, setShowEndForm] = useState(false);
  const [sessionQuality, setSessionQuality] = useState(3);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<ClimbingSession | null>(null);
  const [climbs, setClimbs] = useState<Climb[]>([]);
  const [showLogRoute, setShowLogRoute] = useState(false);
  const [selectedClimb, setSelectedClimb] = useState<Climb | null>(null);
  const navigate = useNavigate();

  // Get Spotify access token from localStorage
  const spotifyAccessToken = localStorage.getItem('spotify_access_token');

  useEffect(() => {
    if (sessionId) {
      fetchSession();
      fetchClimbs();
    }
  }, [sessionId]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    if (isRunning) {
      intervalId = setInterval(() => {
        setElapsedTime(prev => {
          const newTime = prev + 1;
          // Store the updated time
          localStorage.setItem(`session_time_${sessionId}`, newTime.toString());
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRunning, sessionId]);

  useEffect(() => {
    // Store start time when component mounts
    if (sessionId) {
      localStorage.setItem(`session_start_${sessionId}`, startTime.toISOString());
    }
  }, [sessionId, startTime]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (restTimerState === 'running' && restTimeRemaining > 0) {
      intervalId = setInterval(() => {
        if (!restEndTime) return;
        
        const remaining = differenceInSeconds(restEndTime, new Date());
        if (remaining <= 0) {
          setRestTimerState('finished');
          setRestTimeRemaining(0);
          // Clear rest timer storage
          localStorage.removeItem(`rest_start_${sessionId}`);
          localStorage.removeItem(`rest_end_${sessionId}`);
        } else {
          setRestTimeRemaining(remaining);
        }
      }, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [restTimerState, restEndTime, sessionId]);

  async function fetchSession() {
    try {
      const { data, error } = await supabase
        .from('climbing_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      if (data) {
        setSession(data);
        setSessionQuality(data.session_quality);
        setNotes(data.notes || '');
        setIsRunning(true); // Start the session timer automatically
      }
    } catch (err) {
      console.error('Error fetching session:', err);
      navigate('/');
    }
  }

  async function fetchClimbs() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('climbs')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClimbs(data || []);
    } catch (err) {
      console.error('Error fetching climbs:', err);
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleStartRest = () => {
    const start = new Date();
    const end = addMinutes(start, restDuration);
    setRestStartTime(start);
    setRestEndTime(end);
    setRestTimeRemaining(restDuration * 60);
    setRestTimerState('running');
    
    // Store rest timer state
    localStorage.setItem(`rest_start_${sessionId}`, start.toISOString());
    localStorage.setItem(`rest_end_${sessionId}`, end.toISOString());
  };

  const handleResetRest = () => {
    setRestTimerState('setting');
    setRestStartTime(null);
    setRestEndTime(null);
    setRestTimeRemaining(restDuration * 60);
    
    // Clear rest timer storage
    localStorage.removeItem(`rest_start_${sessionId}`);
    localStorage.removeItem(`rest_end_${sessionId}`);
  };

  const handleEndSession = async () => {
    setShowEndForm(true);
    setIsRunning(false);
    // Clear stored time when ending session
    if (sessionId) {
      localStorage.removeItem(`session_time_${sessionId}`);
      localStorage.removeItem(`session_start_${sessionId}`);
    }
  };

  const handleSubmitEnd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('climbing_sessions')
        .update({
          end_time: new Date().toISOString(),
          is_active: false
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      navigate('/');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleLogClimb = (climb: Climb) => {
    setSelectedClimb(climb);
    setShowLogRoute(true);
  };

  const endSession = async () => {
    try {
      setError(null);
      setIsEnding(true);

      const { error: updateError } = await supabase
        .from('climbing_sessions')
        .update({
          end_time: new Date().toISOString(),
          is_active: false
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('sessionEnded', {
        detail: { sessionId }
      }));

      // Clear session from localStorage
      localStorage.removeItem('activeSession');

      navigate('/dashboard');
    } catch (err) {
      console.error('Error ending session:', err);
      setError(err instanceof Error ? err.message : 'Failed to end session');
    } finally {
      setIsEnding(false);
    }
  };

  if (showEndForm) {
    return (
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">End Session</h2>
              <form onSubmit={handleSubmitEnd} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Quality
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={sessionQuality}
                    onChange={(e) => setSessionQuality(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Poor</span>
                    <span>Average</span>
                    <span>Excellent</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="How was your session? Any notable achievements or challenges?"
                  />
                </div>

                {error && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="text-sm text-red-700">{error}</div>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEndForm(false);
                      setIsRunning(true);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Continue Session
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'End Session'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Active Session</h1>
              <div className="text-sm text-gray-500">
                Started at {format(startTime, 'h:mm a')}
              </div>
            </div>

            {/* Spotify Player */}
            {spotifyAccessToken && (
              <div className="mb-8">
                <div className="flex items-center space-x-2 mb-4">
                  <Music className="h-5 w-5 text-indigo-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Spotify</h2>
                </div>
                <SpotifyPlayer accessToken={spotifyAccessToken} />
              </div>
            )}

            {/* Session Timer */}
            <div className="flex flex-col items-center justify-center mb-8">
              <div className="w-48 h-48 rounded-full bg-indigo-50 flex items-center justify-center mb-6">
                <div className="text-center">
                  <Timer className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-indigo-600">
                    {formatTime(elapsedTime)}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  {isRunning ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Resume
                    </>
                  )}
                </button>
                <button
                  onClick={handleEndSession}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-600 bg-red-50 hover:bg-red-100"
                >
                  <StopCircle className="h-4 w-4 mr-2" />
                  End Session
                </button>
              </div>
            </div>

            {/* Rest Timer */}
            <div className="bg-green-50 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-green-900 mb-4">Rest Timer</h2>
              
              {restTimerState === 'setting' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rest Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={restDuration}
                      onChange={(e) => setRestDuration(Math.max(1, Math.min(60, Number(e.target.value))))}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    onClick={handleStartRest}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Rest
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 mb-4">
                    {formatTime(restTimeRemaining)}
                  </div>
                  <div className="flex justify-center space-x-2">
                    {restTimerState !== 'finished' && (
                      <button
                        onClick={() => {
                          if (restTimerState === 'running') {
                            setRestTimerState('paused');
                            // Store current remaining time
                            if (restEndTime) {
                              const pausedEnd = new Date(Date.now() + restTimeRemaining * 1000);
                              setRestEndTime(pausedEnd);
                              localStorage.setItem(`rest_end_${sessionId}`, pausedEnd.toISOString());
                            }
                          } else {
                            setRestTimerState('running');
                            // Update end time based on remaining time
                            const newEnd = new Date(Date.now() + restTimeRemaining * 1000);
                            setRestEndTime(newEnd);
                            localStorage.setItem(`rest_end_${sessionId}`, newEnd.toISOString());
                          }
                        }}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                      >
                        {restTimerState === 'running' ? (
                          <>
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Resume
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={handleResetRest}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Climbs Section */}
            <div className="mt-8 bg-gray-50 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Session Climbs</h2>
              <div className="space-y-4">
                {climbs.map((climb) => (
                  <div
                    key={climb.id}
                    className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-between"
                  >
                    <div>
                      <h3 className="font-medium text-gray-900">{climb.route_name || climb.grade}</h3>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <Map className="h-4 w-4 mr-1" />
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100">
                          {climb.grade}
                        </span>
                        <span className="mx-2">•</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100">
                          {climb.style}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleLogClimb(climb)}
                      className="px-3 py-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      Log Attempt
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Session Stats</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="text-sm text-gray-500">Location</div>
                  <div className="text-lg font-medium">{session?.location}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="text-sm text-gray-500">Energy Level</div>
                  <div className="text-lg font-medium">{session?.energy_level}/5</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="text-sm text-gray-500">Elapsed Time</div>
                  <div className="text-lg font-medium">{formatTime(elapsedTime)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showLogRoute && selectedClimb && sessionId && (
        <LogRouteModal
          route={{
            id: selectedClimb.id,
            user_id: '', // Will be set by the modal
            name: selectedClimb.route_name || selectedClimb.grade,
            location: '',
            type: selectedClimb.style as "sport" | "trad" | "boulder",
            grade: selectedClimb.grade,
            created_at: selectedClimb.created_at,
            updated_at: selectedClimb.created_at
          }}
          sessionId={sessionId}
          onClose={() => {
            setShowLogRoute(false);
            setSelectedClimb(null);
          }}
          onSuccess={() => {
            fetchClimbs();
            setShowLogRoute(false);
            setSelectedClimb(null);
          }}
        />
      )}
    </div>
  );
}