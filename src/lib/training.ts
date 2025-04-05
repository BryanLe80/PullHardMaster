import { supabase } from './supabase';
import type { TrainingPlan, WorkoutTemplate, Exercise, WorkoutLog } from './types';

export async function syncExercises(exercises: Exercise[]) {
  try {
    // Get all existing exercises
    const { data: existingExercises, error: fetchError } = await supabase
      .from('exercises')
      .select('name, type');

    if (fetchError) throw fetchError;

    // Filter out exercises that already exist
    const newExercises = exercises.filter(exercise => 
      !existingExercises?.some(existing => 
        existing.name === exercise.name && existing.type === exercise.type
      )
    );

    if (newExercises.length > 0) {
      const { error: insertError } = await supabase
        .from('exercises')
        .insert(newExercises.map(exercise => ({
          name: exercise.name,
          type: exercise.type,
          description: exercise.description || null
        })));

      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error('Error syncing exercises:', error);
    throw error;
  }
}

export async function createTrainingPlan(plan: Omit<TrainingPlan, 'id' | 'user_id' | 'created_at'>, generateWorkouts = false) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Start a transaction by using single()
  const { data: createdPlan, error: planError } = await supabase
    .from('training_plans')
    .insert([{
      ...plan,
      workout_days: plan.workout_days,
      user_id: user.id
    }])
    .select()
    .single();

  if (planError) throw planError;

  if (generateWorkouts) {
    try {
      // Call the edge function to generate workouts
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-workout`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            focus: plan.focus,
            difficulty: plan.difficulty,
            duration_weeks: plan.duration_weeks,
            workoutDays: plan.workout_days,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate workouts');
      }

      const { workouts } = await response.json();

      // Sync all exercises from the generated workouts to the exercise library
      const allExercises = workouts.flatMap(workout => 
        workout.exercises.map(exercise => ({
          name: exercise.name,
          type: exercise.type,
          description: null
        }))
      );
      
      await syncExercises(allExercises);

      // For each workout, we need to:
      // 1. Create the workout template
      // 2. Create or get the exercises
      // 3. Create the workout_exercises relationships
      for (const workout of workouts) {
        // Create workout template
        const { data: workoutTemplate, error: workoutError } = await supabase
          .from('workout_templates')
          .insert({
            plan_id: createdPlan.id,
            name: workout.name,
            description: workout.description,
            duration_minutes: workout.duration_minutes,
            week_number: workout.week_number,
            day_number: workout.day_number,
          })
          .select()
          .single();

        if (workoutError) throw workoutError;

        // For each exercise in the workout
        for (const exercise of workout.exercises) {
          // First, get the exercise ID from the exercises table
          const { data: existingExercises, error: exerciseQueryError } = await supabase
            .from('exercises')
            .select()
            .eq('name', exercise.name)
            .eq('type', exercise.type)
            .limit(1);

          if (exerciseQueryError) throw exerciseQueryError;

          if (!existingExercises || existingExercises.length === 0) {
            throw new Error(`Exercise not found: ${exercise.name}`);
          }

          // Create workout_exercise relationship
          const { error: relationError } = await supabase
            .from('workout_exercises')
            .insert({
              workout_id: workoutTemplate.id,
              exercise_id: existingExercises[0].id,
              sets: exercise.sets,
              reps: exercise.reps,
              rest_seconds: exercise.rest,
            });

          if (relationError) throw relationError;
        }
      }
    } catch (error) {
      console.error('Error generating workouts:', error);
      throw new Error('Error generating workouts: ' + error.message);
    }
  }

  return createdPlan;
}

export async function deleteTrainingPlan(planId: string) {
  const { error } = await supabase
    .from('training_plans')
    .delete()
    .eq('id', planId);

  if (error) throw error;
}

export async function getTrainingPlans() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('training_plans')
    .select(`
      *,
      workout_templates (
        id,
        name,
        description,
        duration_minutes,
        week_number,
        day_number,
        workout_exercises (
          sets,
          reps,
          rest_seconds,
          exercise:exercises (
            id,
            name,
            description,
            type
          )
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function logWorkout(log: Omit<WorkoutLog, 'id' | 'user_id' | 'created_at'>) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('workout_logs')
    .insert([{
      ...log,
      user_id: user.id
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getWorkoutLogs() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('workout_logs')
    .select(`
      *,
      completed_exercises (
        *,
        exercise:exercises (*)
      )
    `)
    .eq('user_id', user.id)
    .order('date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getExercises() {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('name');

  if (error) throw error;
  return data;
}