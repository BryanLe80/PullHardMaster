/*
  # Update Climbs Schema and Remove Routes

  1. Changes
    - Drop routes-related tables
    - Add photo support to climbs table
    - Add send type tracking to climbs table
    - Update RLS policies

  2. Security
    - Maintain existing RLS policies
    - Add policies for climb photos
*/

-- Drop routes-related tables
DROP TABLE IF EXISTS route_logs;
DROP TABLE IF EXISTS route_photos;
DROP TABLE IF EXISTS routes;

-- Add new columns to climbs table
ALTER TABLE climbs
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS send_type text CHECK (send_type IN ('flash', 'onsight', 'redpoint', 'project'));

-- Create climb_photos table
CREATE TABLE IF NOT EXISTS climb_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  climb_id uuid REFERENCES climbs ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on climb_photos
ALTER TABLE climb_photos ENABLE ROW LEVEL SECURITY;

-- Create policy for climb_photos
CREATE POLICY "Users can manage photos of their climbs"
  ON climb_photos
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM climbs
    JOIN climbing_sessions ON climbing_sessions.id = climbs.session_id
    WHERE climbs.id = climb_photos.climb_id
    AND climbing_sessions.user_id = auth.uid()
  ));

-- Update existing climbs table constraints
ALTER TABLE climbs
DROP CONSTRAINT IF EXISTS climbs_style_check,
ADD CONSTRAINT climbs_style_check CHECK (style IN ('sport', 'trad', 'boulder'));