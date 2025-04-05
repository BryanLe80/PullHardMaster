// Training Types
export type TrainingPlan = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  duration_weeks: number;
  workout_days: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  focus: 'strength' | 'endurance' | 'technique' | 'power';
  created_at: string;
};

export type WorkoutTemplate = {
  id: string;
  plan_id: string;
  name: string;
  description: string;
  exercises: Exercise[];
  duration_minutes: number;
  week_number: number;
  day_number: number;
};

export type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  description: string;
  type: 'strength' | 'cardio' | 'flexibility' | 'technique' | 'power' | 'endurance';
};

export type WorkoutLog = {
  id: string;
  user_id: string;
  session_id?: string;
  template_id?: string;
  date: string;
  energy_level: number;
  perceived_difficulty: number;
  notes: string;
  completed_exercises: CompletedExercise[];
  created_at: string;
};

export type CompletedExercise = {
  exercise_id: string;
  sets_completed: number;
  reps_completed: number;
  notes: string;
};

// Route Types
export type Route = {
  id: string;
  user_id: string;
  name: string;
  location: string;
  grade: string;
  type: 'sport' | 'trad' | 'boulder';
  description?: string;
  created_at: string;
  updated_at: string;
  photos?: RoutePhoto[];
  logs?: RouteLog[];
};

export type RoutePhoto = {
  id: string;
  route_id: string;
  url: string;
  description?: string;
  created_at: string;
};

export type RouteLog = {
  id: string;
  route_id: string;
  session_id: string;
  attempts: number;
  send_type: 'flash' | 'onsight' | 'redpoint' | 'project';
  notes?: string;
  created_at: string;
};