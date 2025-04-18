import React, { useState, useEffect } from 'react';
import { Plus, Dumbbell, Calendar, ChevronRight, ChevronDown, Trash2, Pencil, Save, X } from 'lucide-react';
import { getTrainingPlans, deleteTrainingPlan } from '../lib/training';
import type { TrainingPlan, Exercise } from '../lib/types';
import { NewPlanModal } from './NewPlanModal';
import { supabase } from '../lib/supabase';

export function TrainingPage() {
  const [activeTab, setActiveTab] = useState<'plans' | 'exercises'>('plans');
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [showNewExercise, setShowNewExercise] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['strength', 'endurance', 'flexibility', 'technique', 'power']);
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'strength' as Exercise['type']
  });

  useEffect(() => {
    if (activeTab === 'plans') {
      fetchPlans();
    } else {
      fetchExercises();
    }
  }, [activeTab]);

  async function fetchPlans() {
    try {
      const data = await getTrainingPlans();
      setPlans(data);
    } catch (err) {
      console.error('Error fetching plans:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchExercises() {
    try {
      const { data: exerciseData, error: exerciseError } = await supabase
        .from('exercises')
        .select(`
          *,
          workout_exercises (
            workout_id,
            sets,
            reps,
            rest_seconds,
            workout:workout_templates (
              name,
              plan:training_plans (
                name,
                focus,
                difficulty
              )
            )
          )
        `)
        .order('type')
        .order('name');

      if (exerciseError) throw exerciseError;

      const exercisesWithUsage = exerciseData.map(exercise => ({
        ...exercise,
        usage: exercise.workout_exercises.map(we => ({
          sets: we.sets,
          reps: we.reps,
          rest: we.rest_seconds,
          workout: we.workout.name,
          plan: we.workout.plan.name,
          focus: we.workout.plan.focus,
          difficulty: we.workout.plan.difficulty
        }))
      }));

      setExercises(exercisesWithUsage);
    } catch (err) {
      console.error('Error fetching exercises:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const groupedExercises = exercises.reduce((acc, exercise) => {
    if (!acc[exercise.type]) {
      acc[exercise.type] = [];
    }
    acc[exercise.type].push(exercise);
    return acc;
  }, {} as Record<string, Exercise[]>);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      if (editingId) {
        const { error } = await supabase
          .from('exercises')
          .update({
            name: form.name.trim(),
            description: form.description.trim() || null,
            type: form.type
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('exercises')
          .insert([{
            name: form.name.trim(),
            description: form.description.trim() || null,
            type: form.type
          }]);

        if (error) throw error;
      }

      await fetchExercises();
      handleCancel();
    } catch (err) {
      console.error('Error saving exercise:', err);
      setError(err.message);
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchExercises();
    } catch (err) {
      console.error('Error deleting exercise:', err);
      setError(err.message);
    }
  }

  function handleEdit(exercise: Exercise) {
    setForm({
      name: exercise.name,
      description: exercise.description || '',
      type: exercise.type
    });
    setEditingId(exercise.id);
    setShowNewExercise(true);
  }

  function handleCancel() {
    setForm({
      name: '',
      description: '',
      type: 'strength'
    });
    setEditingId(null);
    setShowNewExercise(false);
  }

  function toggleCategory(category: string) {
    setExpandedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  }

  function getTypeColor(type: string): string {
    switch (type) {
      case 'strength': return 'bg-purple-100 text-purple-800';
      case 'endurance': return 'bg-blue-100 text-blue-800';
      case 'flexibility': return 'bg-green-100 text-green-800';
      case 'technique': return 'bg-orange-100 text-orange-800';
      case 'power': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getTypeIcon(type: string): string {
    switch (type) {
      case 'strength': return '💪';
      case 'endurance': return '🏃';
      case 'flexibility': return '🤸‍♂️';
      case 'technique': return '🎯';
      case 'power': return '⚡';
      default: return '📝';
    }
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Training</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your training plans and exercises
          </p>
        </div>
        <button
          onClick={() => activeTab === 'plans' ? setShowNewPlan(true) : setShowNewExercise(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          New {activeTab === 'plans' ? 'Plan' : 'Exercise'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('plans')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'plans'
                ? 'border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'}
            `}
          >
            Training Plans
          </button>
          <button
            onClick={() => setActiveTab('exercises')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'exercises'
                ? 'border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'}
            `}
          >
            Exercise Library
          </button>
        </nav>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
        </div>
      )}

      {/* Content */}
      {activeTab === 'plans' ? (
        <>
          {plans.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <Dumbbell className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No training plans</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new training plan.</p>
              <div className="mt-6">
                <button
                  onClick={() => setShowNewPlan(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Training Plan
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {plans.map((plan) => (
                  <li key={plan.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div 
                        className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                        onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
                      >
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <Calendar className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                          </div>
                          <div className="ml-4">
                            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">{plan.name}</h2>
                            <div className="mt-2 flex items-center space-x-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(plan.difficulty)}`}>
                                {plan.difficulty}
                              </span>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(plan.focus)}`}>
                                {plan.focus}
                              </span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {plan.duration_weeks} weeks
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(plan.id);
                            }}
                            className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                          {expandedPlan === plan.id ? (
                            <ChevronDown className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                          )}
                        </div>
                      </div>

                      {plan.description && (
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{plan.description}</p>
                      )}

                      {expandedPlan === plan.id && plan.workout_templates && (
                        <div className="mt-4 space-y-4">
                          {Array.from({ length: plan.duration_weeks }, (_, weekIndex) => {
                            const weekNumber = weekIndex + 1;
                            const weekWorkouts = plan.workout_templates.filter(
                              workout => workout.week_number === weekNumber
                            ).sort((a, b) => a.day_number - b.day_number);

                            return (
                              <div key={weekNumber} className="border rounded-lg p-4">
                                <h3 className="text-lg font-medium text-gray-900 mb-3">
                                  Week {weekNumber}
                                </h3>
                                <div className="space-y-3">
                                  {weekWorkouts.map(workout => (
                                    <div key={workout.id} className="bg-gray-50 rounded-lg p-4">
                                      <div className="flex justify-between items-start mb-2">
                                        <h4 className="text-md font-medium text-gray-900">
                                          {workout.name}
                                        </h4>
                                        <span className="text-sm text-gray-500">
                                          {workout.duration_minutes} minutes
                                        </span>
                                      </div>
                                      {workout.description && (
                                        <p className="text-sm text-gray-600 mb-3">
                                          {workout.description}
                                        </p>
                                      )}
                                      <div className="space-y-2">
                                        {workout.workout_exercises?.map(exercise => (
                                          <div 
                                            key={exercise.exercise.id} 
                                            className="flex justify-between items-center text-sm"
                                          >
                                            <span className="text-gray-900">{exercise.exercise.name}</span>
                                            <span className="text-gray-600">
                                              {exercise.sets} × {exercise.reps} ({exercise.rest_seconds}s rest)
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {deleteConfirm === plan.id && (
                        <div className="mt-4 p-4 bg-red-50 rounded-lg">
                          <p className="text-sm text-red-700 mb-3">
                            Are you sure you want to delete this training plan? This action cannot be undone.
                          </p>
                          <div className="flex justify-end space-x-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm(null);
                              }}
                              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTrainingPlan(plan.id);
                                fetchPlans();
                              }}
                              className="px-3 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                            >
                              Delete Plan
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {showNewPlan && (
            <NewPlanModal
              onClose={() => setShowNewPlan(false)}
              onSuccess={() => {
                setShowNewPlan(false);
                fetchPlans();
              }}
            />
          )}
        </>
      ) : (
        <>
          {showNewExercise ? (
            <div className="bg-white shadow sm:rounded-lg p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Exercise Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                    Exercise Type
                  </label>
                  <select
                    id="type"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as Exercise['type'] })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="strength">Strength</option>
                    <option value="endurance">Endurance</option>
                    <option value="flexibility">Flexibility</option>
                    <option value="technique">Technique</option>
                    <option value="power">Power</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
                  >
                    {editingId ? 'Save Changes' : 'Create Exercise'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedExercises).map(([type, typeExercises]) => (
                <div key={type} className="bg-white shadow overflow-hidden sm:rounded-lg">
                  <div
                    className="px-6 py-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleCategory(type)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">{getTypeIcon(type)}</span>
                        <h2 className="text-lg font-medium text-gray-900 capitalize">
                          {type} Exercises ({typeExercises.length})
                        </h2>
                      </div>
                      {expandedCategories.includes(type) ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {expandedCategories.includes(type) && (
                    <ul className="divide-y divide-gray-200">
                      {typeExercises.map((exercise) => (
                        <li key={exercise.id} className="px-6 py-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-medium text-gray-900">{exercise.name}</h3>
                              {exercise.description && (
                                <p className="mt-1 text-sm text-gray-600">{exercise.description}</p>
                              )}
                              {exercise.usage && exercise.usage.length > 0 && (
                                <div className="mt-2">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Used in {exercise.usage.length} workout{exercise.usage.length !== 1 ? 's' : ''}
                                  </span>
                                  <details className="mt-2 cursor-pointer">
                                    <summary className="text-sm font-medium text-indigo-600">
                                      Show usage details
                                    </summary>
                                    <div className="mt-2 space-y-2">
                                      {exercise.usage.map((usage, index) => (
                                        <div key={index} className="pl-4 border-l-2 border-gray-200">
                                          <p className="font-medium text-gray-900">{usage.plan}</p>
                                          <p className="text-sm text-gray-600">
                                            {usage.workout}: {usage.sets} × {usage.reps} ({usage.rest}s rest)
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </details>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-4">
                              <button
                                onClick={() => handleEdit(exercise)}
                                className="text-gray-400 hover:text-gray-500"
                              >
                                <Pencil className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(exercise.id)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}