import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Camera, Pencil, Trash2, ChevronDown, ChevronRight, Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Climb } from '../lib/supabase';

// Extend the Climb type to include additional properties
type ExtendedClimb = Climb & {
  name?: string;
  description?: string;
  send_type?: 'flash' | 'onsight' | 'redpoint' | 'project';
  photos?: {
    id: string;
    url: string;
    description?: string;
  }[];
};

export function RoutesPage() {
  const [climbs, setClimbs] = useState<ExtendedClimb[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewClimb, setShowNewClimb] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedClimb, setExpandedClimb] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photoDescription, setPhotoDescription] = useState('');
  const [form, setForm] = useState({
    name: '',
    grade: '',
    style: 'sport' as Climb['style'],
    description: '',
    attempts: 1,
    completed: false,
    send_type: 'project' as 'flash' | 'onsight' | 'redpoint' | 'project',
    notes: ''
  });

  useEffect(() => {
    fetchClimbs();
  }, []);

  async function fetchClimbs() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('climbs')
        .select(`
          *,
          photos:climb_photos(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClimbs(data || []);
    } catch (err) {
      console.error('Error fetching climbs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch climbs');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (editingId) {
        const { error } = await supabase
          .from('climbs')
          .update({
            name: form.name.trim(),
            grade: form.grade.trim(),
            style: form.style,
            description: form.description.trim() || null,
            attempts: form.attempts,
            completed: form.completed,
            send_type: form.send_type,
            notes: form.notes.trim() || null
          })
          .eq('id', editingId);

        if (error) throw error;
      }

      await fetchClimbs();
      handleCancel();
    } catch (err) {
      console.error('Error saving climb:', err);
      setError(err instanceof Error ? err.message : 'Failed to save climb');
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase
        .from('climbs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchClimbs();
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting climb:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete climb');
    }
  }

  async function handlePhotoUpload(climbId: string, files: FileList) {
    setUploadingPhotos(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${climbId}/${fileName}`;

        // Upload file to storage
        const { error: uploadError } = await supabase.storage
          .from('climb-photos')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('climb-photos')
          .getPublicUrl(filePath);

        // Create photo record
        const { error: dbError } = await supabase
          .from('climb_photos')
          .insert({
            climb_id: climbId,
            url: publicUrl,
            description: photoDescription.trim() || null
          });

        if (dbError) throw dbError;
      }

      setPhotoDescription('');
      await fetchClimbs();
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setUploadingPhotos(false);
    }
  }

  async function handleDeletePhoto(photoId: string) {
    try {
      const { error } = await supabase
        .from('climb_photos')
        .delete()
        .eq('id', photoId);

      if (error) throw error;
      await fetchClimbs();
    } catch (err) {
      console.error('Error deleting photo:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete photo');
    }
  }

  function handleEdit(climb: ExtendedClimb) {
    setForm({
      name: climb.name || '',
      grade: climb.grade,
      style: climb.style,
      description: climb.description || '',
      attempts: climb.attempts,
      completed: climb.completed,
      send_type: climb.send_type || 'project',
      notes: climb.notes || ''
    });
    setEditingId(climb.id);
    setShowNewClimb(true);
  }

  function handleCancel() {
    setForm({
      name: '',
      grade: '',
      style: 'sport',
      description: '',
      attempts: 1,
      completed: false,
      send_type: 'project',
      notes: ''
    });
    setEditingId(null);
    setShowNewClimb(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Climbs</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View and manage your climbing history
          </p>
        </div>
        <button
          onClick={() => setShowNewClimb(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Climb
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
        </div>
      )}

      {showNewClimb && (
        <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Name
              </label>
              <input
                type="text"
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="grade" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Grade
                </label>
                <input
                  type="text"
                  id="grade"
                  value={form.grade}
                  onChange={(e) => setForm({ ...form, grade: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                  required
                />
              </div>

              <div>
                <label htmlFor="style" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Style
                </label>
                <select
                  id="style"
                  value={form.style}
                  onChange={(e) => setForm({ ...form, style: e.target.value as Climb['style'] })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="sport">Sport</option>
                  <option value="trad">Trad</option>
                  <option value="boulder">Boulder</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="attempts" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Attempts
                </label>
                <input
                  type="number"
                  id="attempts"
                  min="1"
                  value={form.attempts}
                  onChange={(e) => setForm({ ...form, attempts: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>

              <div>
                <label htmlFor="send_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Send Type
                </label>
                <select
                  id="send_type"
                  value={form.send_type}
                  onChange={(e) => setForm({ ...form, send_type: e.target.value as typeof form.send_type })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="project">Project</option>
                  <option value="redpoint">Redpoint</option>
                  <option value="flash">Flash</option>
                  <option value="onsight">Onsight</option>
                </select>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="completed"
                checked={form.completed}
                onChange={(e) => setForm({ ...form, completed: e.target.checked })}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
              />
              <label htmlFor="completed" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                Completed
              </label>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Notes
              </label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                {editingId ? 'Save Changes' : 'Create Climb'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {climbs.map((climb) => (
          <div key={climb.id} className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <div className="px-6 py-4">
              <div 
                className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => setExpandedClimb(expandedClimb === climb.id ? null : climb.id)}
              >
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{climb.name || climb.grade}</h3>
                  <div className="mt-1 flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                      {climb.grade}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200">
                      {climb.style}
                    </span>
                    {climb.send_type && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                        {climb.send_type}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(climb);
                    }}
                    className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(climb.id);
                    }}
                    className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                  {expandedClimb === climb.id ? (
                    <ChevronDown className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  )}
                </div>
              </div>

              {climb.description && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{climb.description}</p>
              )}

              {deleteConfirm === climb.id && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                    Are you sure you want to delete this climb? This action cannot be undone.
                  </p>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(null);
                      }}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(climb.id);
                      }}
                      className="px-3 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                    >
                      Delete Climb
                    </button>
                  </div>
                </div>
              )}

              {expandedClimb === climb.id && (
                <div className="mt-4 space-y-4">
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Details</h4>
                    <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Attempts</dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{climb.attempts}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                          {climb.completed ? 'Completed' : 'In Progress'}
                        </dd>
                      </div>
                      {climb.notes && (
                        <div className="sm:col-span-2">
                          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Notes</dt>
                          <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{climb.notes}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {/* Photos Section */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Photos</h4>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => {
                            if (e.target.files?.length) {
                              handlePhotoUpload(climb.id, e.target.files);
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <button
                          type="button"
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-700"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Add Photos
                        </button>
                      </div>
                    </div>

                    {uploadingPhotos && (
                      <div className="mb-4 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Uploading photos...</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Photo description (optional)"
                        value={photoDescription}
                        onChange={(e) => setPhotoDescription(e.target.value)}
                        className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm dark:bg-gray-700 dark:text-gray-100"
                      />
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3">
                      {climb.photos?.map((photo) => (
                        <div key={photo.id} className="relative group">
                          <img
                            src={photo.url}
                            alt={photo.description || climb.name || climb.grade}
                            className="h-24 w-full object-cover rounded-lg"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center">
                            <button
                              onClick={() => handleDeletePhoto(photo.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 text-white p-2 rounded-full hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          {photo.description && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <p className="text-white text-xs p-2 text-center">
                                {photo.description}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}