import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Exercise templates by type and difficulty
const exerciseTemplates = {
  strength: {
    beginner: [
      { name: 'Push-ups', sets: 3, reps: 10, rest: 60, type: 'strength' },
      { name: 'Pull-ups Negatives', sets: 3, reps: 5, rest: 90, type: 'strength' },
      { name: 'Bodyweight Squats', sets: 3, reps: 15, rest: 60, type: 'strength' },
      { name: 'Plank Hold', sets: 3, reps: 30, rest: 60, type: 'strength' }, // reps in seconds
      { name: 'Inverted Rows', sets: 3, reps: 8, rest: 90, type: 'strength' },
    ],
    intermediate: [
      { name: 'Pull-ups', sets: 4, reps: 8, rest: 90, type: 'strength' },
      { name: 'Weighted Push-ups', sets: 4, reps: 12, rest: 90, type: 'strength' },
      { name: 'Pistol Squats', sets: 3, reps: 8, rest: 120, type: 'strength' },
      { name: 'L-Sit Progression', sets: 4, reps: 20, rest: 90, type: 'strength' }, // reps in seconds
      { name: 'Ring Rows', sets: 4, reps: 10, rest: 90, type: 'strength' },
    ],
    advanced: [
      { name: 'Weighted Pull-ups', sets: 5, reps: 5, rest: 180, type: 'strength' },
      { name: 'One-arm Push-up Progression', sets: 4, reps: 6, rest: 120, type: 'strength' },
      { name: 'Front Lever Progression', sets: 4, reps: 5, rest: 180, type: 'strength' },
      { name: 'Muscle-ups', sets: 4, reps: 3, rest: 180, type: 'strength' },
      { name: 'Ring Dips', sets: 4, reps: 8, rest: 120, type: 'strength' },
    ],
  },
  endurance: {
    beginner: [
      { name: 'Traversing', sets: 3, reps: 1, rest: 120, type: 'cardio' },
      { name: 'Down Climbing', sets: 3, reps: 1, rest: 120, type: 'cardio' },
      { name: 'Easy Boulder Circuits', sets: 2, reps: 1, rest: 180, type: 'cardio' },
      { name: 'Hangboard Repeaters', sets: 3, reps: 6, rest: 120, type: 'cardio' },
      { name: 'Jump Rope', sets: 3, reps: 60, rest: 60, type: 'cardio' }, // reps in seconds
    ],
    intermediate: [
      { name: 'Power Endurance Circuits', sets: 4, reps: 1, rest: 180, type: 'cardio' },
      { name: '4x4s', sets: 4, reps: 4, rest: 240, type: 'cardio' },
      { name: 'Linked Boulder Problems', sets: 3, reps: 1, rest: 180, type: 'cardio' },
      { name: 'Campus Ladders', sets: 3, reps: 3, rest: 180, type: 'cardio' },
      { name: 'System Board Intervals', sets: 4, reps: 1, rest: 180, type: 'cardio' },
    ],
    advanced: [
      { name: 'Campus Board Intervals', sets: 5, reps: 1, rest: 180, type: 'cardio' },
      { name: 'Continuous Climbing', sets: 3, reps: 1, rest: 300, type: 'cardio' },
      { name: 'Complex Boulder Circuits', sets: 4, reps: 1, rest: 240, type: 'cardio' },
      { name: 'Power Endurance Links', sets: 4, reps: 1, rest: 240, type: 'cardio' },
      { name: 'Anaerobic Capacity Training', sets: 5, reps: 1, rest: 240, type: 'cardio' },
    ],
  },
  technique: {
    beginner: [
      { name: 'Silent Feet Drills', sets: 3, reps: 1, rest: 60, type: 'technique' },
      { name: 'Flag Practice', sets: 3, reps: 5, rest: 60, type: 'technique' },
      { name: 'Drop Knee Practice', sets: 3, reps: 5, rest: 60, type: 'technique' },
      { name: 'Balance Exercises', sets: 3, reps: 5, rest: 60, type: 'technique' },
      { name: 'Basic Route Reading', sets: 3, reps: 1, rest: 60, type: 'technique' },
    ],
    intermediate: [
      { name: 'Dynamic Movement Practice', sets: 4, reps: 5, rest: 90, type: 'technique' },
      { name: 'Heel Hook Practice', sets: 4, reps: 5, rest: 90, type: 'technique' },
      { name: 'Momentum Drills', sets: 3, reps: 5, rest: 90, type: 'technique' },
      { name: 'Advanced Flagging', sets: 4, reps: 5, rest: 90, type: 'technique' },
      { name: 'Deadpoint Practice', sets: 4, reps: 5, rest: 120, type: 'technique' },
    ],
    advanced: [
      { name: 'Complex Movement Sequences', sets: 4, reps: 3, rest: 120, type: 'technique' },
      { name: 'Precision Footwork Drills', sets: 4, reps: 5, rest: 90, type: 'technique' },
      { name: 'Advanced Body Positioning', sets: 4, reps: 5, rest: 120, type: 'technique' },
      { name: 'Dynamic Coordination', sets: 4, reps: 3, rest: 120, type: 'technique' },
      { name: 'Flow Training', sets: 3, reps: 1, rest: 180, type: 'technique' },
    ],
  },
  power: {
    beginner: [
      { name: 'Box Jumps', sets: 3, reps: 6, rest: 120, type: 'power' },
      { name: 'Explosive Pull-ups', sets: 3, reps: 5, rest: 120, type: 'power' },
      { name: 'Medicine Ball Throws', sets: 3, reps: 8, rest: 120, type: 'power' },
      { name: 'Squat Jumps', sets: 3, reps: 6, rest: 120, type: 'power' },
      { name: 'Clap Push-ups', sets: 3, reps: 5, rest: 120, type: 'power' },
    ],
    intermediate: [
      { name: 'Campus Board Basic', sets: 4, reps: 5, rest: 180, type: 'power' },
      { name: 'Power Pull-ups', sets: 4, reps: 5, rest: 180, type: 'power' },
      { name: 'Plyometric Training', sets: 4, reps: 6, rest: 180, type: 'power' },
      { name: 'Dynamic Moves', sets: 4, reps: 5, rest: 180, type: 'power' },
      { name: 'Lock-off Pulls', sets: 4, reps: 3, rest: 180, type: 'power' },
    ],
    advanced: [
      { name: 'Double Dynos', sets: 5, reps: 3, rest: 240, type: 'power' },
      { name: 'Campus Board Advanced', sets: 5, reps: 4, rest: 240, type: 'power' },
      { name: 'Max Recruitment Pulls', sets: 5, reps: 3, rest: 240, type: 'power' },
      { name: 'Explosive Campus Training', sets: 5, reps: 3, rest: 240, type: 'power' },
      { name: 'Power Endurance Complex', sets: 4, reps: 1, rest: 300, type: 'power' },
    ],
  },
};

function calculateProgression(baseValue: number, week: number, type: 'sets' | 'reps' | 'rest'): number {
  const progressionRate = {
    sets: 0.2,    // Slower progression for sets
    reps: 0.3,    // Moderate progression for reps
    rest: -0.05   // Slight decrease in rest time
  };

  const maxIncrease = {
    sets: 3,      // Maximum 3 additional sets
    reps: 6,      // Maximum 6 additional reps
    rest: -30     // Maximum 30 seconds decrease in rest
  };

  const weeklyIncrease = baseValue * progressionRate[type] * (week - 1);
  const increase = Math.min(weeklyIncrease, maxIncrease[type]);

  if (type === 'rest') {
    // Don't let rest time go below 50% of original
    return Math.max(baseValue + increase, baseValue * 0.5);
  }

  return Math.round(baseValue + increase);
}

function generateWorkouts(focus: string, difficulty: string, weeks: number, workoutsPerWeek: number) {
  const workouts = [];
  const exercises = exerciseTemplates[focus][difficulty];

  for (let week = 1; week <= weeks; week++) {
    // Rotate through exercise combinations to provide variety
    const weekExercises = [...exercises]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    for (let day = 1; day <= workoutsPerWeek; day++) {
      // Adjust exercise selection based on the day of the week
      const dayExercises = weekExercises.map(ex => ({
        ...ex,
        sets: calculateProgression(ex.sets, week, 'sets'),
        reps: calculateProgression(ex.reps, week, 'reps'),
        rest: calculateProgression(ex.rest, week, 'rest'),
      }));

      const workout = {
        name: `${focus.charAt(0).toUpperCase() + focus.slice(1)} Workout ${day}`,
        description: `Week ${week}, Day ${day} ${focus} training session focusing on progressive overload`,
        week_number: week,
        day_number: day,
        duration_minutes: 60,
        exercises: dayExercises,
      };
      workouts.push(workout);
    }
  }

  return workouts;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { focus, difficulty, duration_weeks, workoutDays = 3 } = await req.json();

    if (!focus || !difficulty || !duration_weeks) {
      throw new Error('Missing required parameters');
    }

    const workouts = generateWorkouts(focus, difficulty, duration_weeks, workoutDays);

    return new Response(
      JSON.stringify({ workouts }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
});