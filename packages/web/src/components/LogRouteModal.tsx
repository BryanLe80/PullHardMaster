import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Route, RouteLog } from '../lib/types';

type LogRouteModalProps = {
  route: Route;
  sessionId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function LogRouteModal({ route, sessionId, onClose, onSuccess }: LogRouteModalProps) {
  const [form, setForm] = useState({
    attempts: 1,
    send_type: 'project' as RouteLog['send_type'],
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: logError } = await supabase
        .from('route_logs')
        .insert([{
          route_id: route.id,
          session_id: sessionId,
          attempts: form.attempts,
          send_type: form.send_type,
          notes: form.notes.trim() || null,
        }]);

      if (logError) throw logError;

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error logging route:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Log Attempt: {route.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="attempts" className="block text-sm font-medium text-gray-700">
              Number of Attempts
            </label>
            <input
              type="number"
              id="attempts"
              min="1"
              value={form.attempts}
              onChange={(e) => setForm({ ...form, attempts: parseInt(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="send_type" className="block text-sm font-medium text-gray-700">
              Send Type
            </label>
            <select
              id="send_type"
              value={form.send_type}
              onChange={(e) => setForm({ ...form, send_type: e.target.value as RouteLog['send_type'] })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="project">Project</option>
              <option value="redpoint">Redpoint</option>
              <option value="flash">Flash</option>
              <option value="onsight">Onsight</option>
            </select>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Any beta, thoughts, or feelings about the attempt..."
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
              {loading ? 'Saving...' : 'Log Attempt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}