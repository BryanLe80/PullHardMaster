/*
  # Add climb photos and logs

  1. Changes
    - Add name and description columns to climbs table
    - Add send_type column to climbs table
    - Create climb_photos table for storing climb photos
    - Add appropriate RLS policies
*/

-- Add new columns to climbs table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'climbs' AND column_name = 'name') THEN
    ALTER TABLE climbs ADD COLUMN name text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'climbs' AND column_name = 'description') THEN
    ALTER TABLE climbs ADD COLUMN description text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'climbs' AND column_name = 'send_type') THEN
    ALTER TABLE climbs ADD COLUMN send_type text CHECK (send_type IN ('flash', 'onsight', 'redpoint', 'project'));
  END IF;
END $$;

-- Create climb_photos table if it doesn't exist
CREATE TABLE IF NOT EXISTS climb_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  climb_id uuid REFERENCES climbs ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on climb_photos if not already enabled
ALTER TABLE climb_photos ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can manage photos of their climbs" ON climb_photos;

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
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'climbs_style_check') THEN
    ALTER TABLE climbs DROP CONSTRAINT climbs_style_check;
  END IF;
  
  ALTER TABLE climbs ADD CONSTRAINT climbs_style_check CHECK (style IN ('sport', 'trad', 'boulder'));
EXCEPTION
  WHEN others THEN NULL;
END $$;