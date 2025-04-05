/*
  # Add Routes and Photos Support (Safe Migration)

  1. Changes
    - Add IF NOT EXISTS checks for all table creations
    - Add IF NOT EXISTS checks for triggers and functions
    - Keep all RLS policies and constraints
*/

-- Create routes table if it doesn't exist
CREATE TABLE IF NOT EXISTS routes (
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

-- Create route_photos table if it doesn't exist
CREATE TABLE IF NOT EXISTS route_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid REFERENCES routes ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create route_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS route_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid REFERENCES routes ON DELETE CASCADE NOT NULL,
  session_id uuid REFERENCES climbing_sessions ON DELETE CASCADE NOT NULL,
  attempts integer DEFAULT 1,
  send_type text CHECK (send_type IN ('flash', 'onsight', 'redpoint', 'project')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS if not already enabled
DO $$ 
BEGIN
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', 'routes');
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', 'route_photos');
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', 'route_logs');
EXCEPTION 
  WHEN others THEN NULL;
END $$;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can manage their own routes" ON routes;
  DROP POLICY IF EXISTS "Users can manage photos of their routes" ON route_photos;
  DROP POLICY IF EXISTS "Users can manage their route logs" ON route_logs;
EXCEPTION 
  WHEN others THEN NULL;
END $$;

-- Create policies
CREATE POLICY "Users can manage their own routes"
  ON routes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage photos of their routes"
  ON route_photos
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM routes
    WHERE routes.id = route_photos.route_id
    AND routes.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their route logs"
  ON route_logs
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM routes
    WHERE routes.id = route_logs.route_id
    AND routes.user_id = auth.uid()
  ));

-- Create or replace updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists and create new one
DO $$ 
BEGIN
  DROP TRIGGER IF EXISTS update_routes_updated_at ON routes;
EXCEPTION 
  WHEN others THEN NULL;
END $$;

CREATE TRIGGER update_routes_updated_at
  BEFORE UPDATE
  ON routes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();