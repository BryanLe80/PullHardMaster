-- Add is_active field to climbing_sessions table
ALTER TABLE climbing_sessions
ADD COLUMN is_active BOOLEAN DEFAULT false;

-- Update existing sessions to be active if they are from today
UPDATE climbing_sessions
SET is_active = true
WHERE date::date = CURRENT_DATE; 