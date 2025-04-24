/*
  # Update climbing sessions schema and policies

  1. Changes
    - Add NOT NULL constraints to required fields
    - Add default values for quality and notes
    - Update RLS policies to ensure proper access control

  2. Security
    - Enable RLS on climbing_sessions table
    - Add policies for:
      - Users can create their own sessions
      - Users can read their own sessions
      - Users can update their own sessions
      - Users can delete their own sessions
*/

-- Update climbing_sessions table constraints
ALTER TABLE climbing_sessions
ALTER COLUMN quality SET DEFAULT 3,
ALTER COLUMN quality SET NOT NULL,
ALTER COLUMN notes SET DEFAULT NULL,
ADD CONSTRAINT quality_range CHECK (quality >= 1 AND quality <= 5);

-- Enable Row Level Security
ALTER TABLE climbing_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'climbing_sessions') THEN
    DROP POLICY IF EXISTS "Users can create their own sessions" ON climbing_sessions;
    DROP POLICY IF EXISTS "Users can read their own sessions" ON climbing_sessions;
    DROP POLICY IF EXISTS "Users can update their own sessions" ON climbing_sessions;
    DROP POLICY IF EXISTS "Users can delete their own sessions" ON climbing_sessions;
  END IF;
END $$;

-- Create policies
CREATE POLICY "Users can create their own sessions"
ON climbing_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own sessions"
ON climbing_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
ON climbing_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
ON climbing_sessions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);