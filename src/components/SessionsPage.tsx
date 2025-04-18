import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import type { ClimbingSession } from '../lib/supabase';
import { Pencil, Save, X, Clock, MapPin, Battery, ClipboardList, Trash2, Star } from 'lucide-react';

export function SessionsPage() {
  const [sessions, setSessions] = useState<ClimbingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    location: '',
    energy_level: 3,
    session_quality: 3,
    notes: ''
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  async function fetchSessions() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('climbing_sessions')
        .select(`
          *,
          climbs (*)
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  }

  const startEditing = (session: ClimbingSession) => {
    setEditingId(session.id);
    setEditForm({
      location: session.location,
      energy_level: session.energy_level,
      session_quality: session.session_quality,
      notes: session.notes || ''
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({
      location: '',
      energy_level: 3,
      session_quality: 3,
      notes: ''
    });
  };

  const handleSave = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('climbing_sessions')
        .update({
          location: editForm.location.trim(),
          energy_level: editForm.energy_level,
          session_quality: editForm.session_quality,
          notes: editForm.notes.trim() || null
        })
        .eq('id', sessionId);

      if (error) throw error;

      await fetchSessions();
      cancelEditing();
    } catch (err) {
      console.error('Error updating session:', err);
      setError(err instanceof Error ? err.message : 'Failed to update session');
    }
  };

  const handleDelete = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('climbing_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      await fetchSessions();
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting session:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    }
  };

  const getQualityColor = (quality: number): string => {
    switch (quality) {
      case 1: return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200';
      case 2: return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200';
      case 3: return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200';
      case 4: return 'bg-lime-100 dark:bg-lime-900/30 text-lime-800 dark:text-lime-200';
      case 5: return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
    }
  };

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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Manage Sessions</h1>
      
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {sessions.map((session) => (
            <li key={session.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700">
              {editingId === session.id ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      Energy Level
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={editForm.energy_level}
                      onChange={(e) => setEditForm({ ...editForm, energy_level: Number(e.target.value) })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                      <span>Low Energy</span>
                      <span>Medium Energy</span>
                      <span>High Energy</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      Session Quality
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={editForm.session_quality}
                      onChange={(e) => setEditForm({ ...editForm, session_quality: Number(e.target.value) })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                      <span>Poor</span>
                      <span>Average</span>
                      <span>Excellent</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      rows={3}
                      className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                      placeholder="Add any notes about your session..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={cancelEditing}
                      className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSave(session.id)}
                      className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 border border-transparent rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {session.location}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => startEditing(session)}
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(session.id)}
                        className="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {format(new Date(session.date), 'PPP p')}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Battery className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <span className={`px-2 py-1 rounded text-sm ${getQualityColor(session.energy_level)}`}>
                        Energy Level: {session.energy_level}/5
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Star className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <span className={`px-2 py-1 rounded text-sm ${getQualityColor(session.session_quality)}`}>
                        Session Quality: {session.session_quality}/5
                      </span>
                    </div>

                    {session.climbs && (
                      <div className="flex items-center space-x-2">
                        <ClipboardList className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {session.climbs.length} climbs recorded
                        </span>
                      </div>
                    )}
                  </div>

                  {session.notes && (
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md">
                      {session.notes}
                    </div>
                  )}

                  {deleteConfirm === session.id && (
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                        Are you sure you want to delete this session? This action cannot be undone.
                      </p>
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDelete(session.id)}
                          className="px-3 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-500 border border-transparent rounded-md hover:bg-red-700 dark:hover:bg-red-600"
                        >
                          Delete Session
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}