/*
  # Climbing Workout Tracker Schema

  1. New Tables
    - `climbing_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `date` (timestamp with timezone)
      - `location` (text)
      - `notes` (text)
      - `created_at` (timestamp with timezone)
      
    - `climbs`
      - `id` (uuid, primary key)
      - `session_id` (uuid, references climbing_sessions)
      - `grade` (text)
      - `style` (text) - boulder, sport, trad
      - `attempts` (int)
      - `completed` (boolean)
      - `notes` (text)
      - `created_at` (timestamp with timezone)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create climbing_sessions table
CREATE TABLE climbing_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  date timestamptz NOT NULL DEFAULT now(),
  location text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create climbs table
CREATE TABLE climbs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES climbing_sessions ON DELETE CASCADE NOT NULL,
  grade text NOT NULL,
  style text NOT NULL,
  attempts integer DEFAULT 1,
  completed boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE climbing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE climbs ENABLE ROW LEVEL SECURITY;

-- Policies for climbing_sessions
CREATE POLICY "Users can create their own sessions"
  ON climbing_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own sessions"
  ON climbing_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON climbing_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON climbing_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for climbs
CREATE POLICY "Users can manage climbs in their sessions"
  ON climbs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM climbing_sessions
      WHERE climbing_sessions.id = climbs.session_id
      AND climbing_sessions.user_id = auth.uid()
    )
  );