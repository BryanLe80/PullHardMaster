/*
  # Update exercises table RLS policies

  1. Changes
    - Add policy to allow authenticated users to create exercises
    - Keep existing policy for viewing exercises

  2. Security
    - Maintain read-only access for authenticated users
    - Add insert permission for authenticated users
    - No update/delete permissions (exercises should be immutable)
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Everyone can view exercises" ON exercises;

-- Create new policies
CREATE POLICY "Everyone can view exercises"
  ON exercises
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create exercises"
  ON exercises
  FOR INSERT
  TO authenticated
  WITH CHECK (true);