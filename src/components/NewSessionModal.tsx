import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

type NewSessionModalProps = {
  onClose: () => void;
  onSuccess: () => void;
  existingLocations: string[];
};

export function NewSessionModal({ onClose, onSuccess, existingLocations }: NewSessionModalProps) {
  const [location, setLocation] = useState('');
  const [energyLevel, setEnergyLevel] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const uniqueLocations = Array.from(new Set(existingLocations)).sort();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!location) {
      setError('Please enter a location');
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('climbing_sessions')
        .insert([
          {
            location: location.trim(),
            energy_level: energyLevel,
            session_quality: 3, // Default value, will be updated at session end
            date: new Date().toISOString(),
            user_id: user.id
          }
        ])
        .select()
        .single();

      if (error) throw error;

      onSuccess();
      onClose();
      // Store session start time in localStorage to trigger session check
      localStorage.setItem(`session_start_${data.id}`, new Date().toISOString());
      // Trigger storage event to notify other tabs
      window.dispatchEvent(new StorageEvent('storage', {
        key: `session_start_${data.id}`,
        newValue: new Date().toISOString()
      }));
      navigate(`/session/${data.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">New Climbing Session</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              id="location"
              list="locations"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Select or enter a location"
            />
            <datalist id="locations">
              {uniqueLocations.map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Current Energy Level</label>
            <div className="mt-1">
              <input
                type="range"
                min="1"
                max="5"
                value={energyLevel}
                onChange={(e) => setEnergyLevel(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Low Energy</span>
                <span>Medium Energy</span>
                <span>High Energy</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}