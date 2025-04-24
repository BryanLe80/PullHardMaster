/*
  # Add Routes and Photos Support

  1. New Tables
    - `routes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `location` (text)
      - `grade` (text)
      - `type` (text) - sport, trad, boulder
      - `description` (text)
      - `created_at` (timestamp with timezone)
      - `updated_at` (timestamp with timezone)

    - `route_photos`
      - `id` (uuid, primary key)
      - `route_id` (uuid, references routes)
      - `url` (text)
      - `description` (text)
      - `created_at` (timestamp with timezone)

    - `route_logs`
      - `id` (uuid, primary key)
      - `route_id` (uuid, references routes)
      - `session_id` (uuid, references climbing_sessions)
      - `attempts` (integer)
      - `send_type` (text) - flash, onsight, redpoint
      - `notes` (text)
      - `created_at` (timestamp with timezone)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create routes table
CREATE TABLE routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  location text NOT NULL,
  grade text NOT NULL,
  type text NOT NULL CHECK (type IN ('sport', 'trad', 'boulder')),
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create route_photos table
CREATE TABLE route_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid REFERENCES routes ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create route_logs table
CREATE TABLE route_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid REFERENCES routes ON DELETE CASCADE NOT NULL,
  session_id uuid REFERENCES climbing_sessions ON DELETE CASCADE NOT NULL,
  attempts integer DEFAULT 1,
  send_type text CHECK (send_type IN ('flash', 'onsight', 'redpoint', 'project')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for routes
CREATE POLICY "Users can manage their own routes"
  ON routes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for route_photos
CREATE POLICY "Users can manage photos of their routes"
  ON route_photos
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM routes
    WHERE routes.id = route_photos.route_id
    AND routes.user_id = auth.uid()
  ));

-- Create policies for route_logs
CREATE POLICY "Users can manage their route logs"
  ON route_logs
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM routes
    WHERE routes.id = route_logs.route_id
    AND routes.user_id = auth.uid()
  ));

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updating timestamp
CREATE TRIGGER update_routes_updated_at
  BEFORE UPDATE
  ON routes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();