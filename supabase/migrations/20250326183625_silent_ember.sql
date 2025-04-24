/*
  # Add Training System Tables

  1. New Tables
    - `training_plans`: Stores workout program templates
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `description` (text)
      - `duration_weeks` (integer)
      - `difficulty` (text)
      - `focus` (text)
      - `created_at` (timestamp with timezone)

    - `workout_templates`: Stores individual workout templates
      - `id` (uuid, primary key)
      - `plan_id` (uuid, references training_plans)
      - `name` (text)
      - `description` (text)
      - `duration_minutes` (integer)
      - `week_number` (integer)
      - `day_number` (integer)
      - `created_at` (timestamp with timezone)

    - `exercises`: Stores exercise definitions
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `type` (text)
      - `created_at` (timestamp with timezone)

    - `workout_exercises`: Junction table for workout templates and exercises
      - `id` (uuid, primary key)
      - `workout_id` (uuid, references workout_templates)
      - `exercise_id` (uuid, references exercises)
      - `sets` (integer)
      - `reps` (integer)
      - `rest_seconds` (integer)
      - `notes` (text)

    - `workout_logs`: Stores completed workout records
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `session_id` (uuid, references climbing_sessions)
      - `template_id` (uuid, references workout_templates)
      - `date` (timestamp with timezone)
      - `energy_level` (integer)
      - `perceived_difficulty` (integer)
      - `notes` (text)
      - `created_at` (timestamp with timezone)

    - `completed_exercises`: Stores exercise completion records
      - `id` (uuid, primary key)
      - `workout_log_id` (uuid, references workout_logs)
      - `exercise_id` (uuid, references exercises)
      - `sets_completed` (integer)
      - `reps_completed` (integer)
      - `notes` (text)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create training_plans table
CREATE TABLE training_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  description text,
  duration_weeks integer NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  focus text NOT NULL CHECK (focus IN ('strength', 'endurance', 'technique', 'power')),
  created_at timestamptz DEFAULT now()
);

-- Create workout_templates table
CREATE TABLE workout_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES training_plans ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL,
  week_number integer NOT NULL,
  day_number integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (plan_id, week_number, day_number)
);

-- Create exercises table
CREATE TABLE exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('strength', 'cardio', 'flexibility', 'technique')),
  created_at timestamptz DEFAULT now()
);

-- Create workout_exercises junction table
CREATE TABLE workout_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid REFERENCES workout_templates ON DELETE CASCADE NOT NULL,
  exercise_id uuid REFERENCES exercises ON DELETE CASCADE NOT NULL,
  sets integer NOT NULL,
  reps integer NOT NULL,
  rest_seconds integer NOT NULL,
  notes text,
  UNIQUE (workout_id, exercise_id)
);

-- Create workout_logs table
CREATE TABLE workout_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  session_id uuid REFERENCES climbing_sessions ON DELETE SET NULL,
  template_id uuid REFERENCES workout_templates ON DELETE SET NULL,
  date timestamptz NOT NULL DEFAULT now(),
  energy_level integer NOT NULL CHECK (energy_level BETWEEN 1 AND 5),
  perceived_difficulty integer NOT NULL CHECK (perceived_difficulty BETWEEN 1 AND 5),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create completed_exercises table
CREATE TABLE completed_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_log_id uuid REFERENCES workout_logs ON DELETE CASCADE NOT NULL,
  exercise_id uuid REFERENCES exercises ON DELETE CASCADE NOT NULL,
  sets_completed integer NOT NULL,
  reps_completed integer NOT NULL,
  notes text,
  UNIQUE (workout_log_id, exercise_id)
);

-- Enable RLS on all tables
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE completed_exercises ENABLE ROW LEVEL SECURITY;

-- Create policies for training_plans
CREATE POLICY "Users can manage their own training plans"
  ON training_plans
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for workout_templates
CREATE POLICY "Users can manage workout templates in their plans"
  ON workout_templates
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM training_plans
    WHERE training_plans.id = workout_templates.plan_id
    AND training_plans.user_id = auth.uid()
  ));

-- Create policies for exercises
CREATE POLICY "Everyone can view exercises"
  ON exercises
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for workout_exercises
CREATE POLICY "Users can manage exercises in their workout templates"
  ON workout_exercises
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workout_templates
    JOIN training_plans ON training_plans.id = workout_templates.plan_id
    WHERE workout_templates.id = workout_exercises.workout_id
    AND training_plans.user_id = auth.uid()
  ));

-- Create policies for workout_logs
CREATE POLICY "Users can manage their own workout logs"
  ON workout_logs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for completed_exercises
CREATE POLICY "Users can manage their completed exercises"
  ON completed_exercises
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workout_logs
    WHERE workout_logs.id = completed_exercises.workout_log_id
    AND workout_logs.user_id = auth.uid()
  ));