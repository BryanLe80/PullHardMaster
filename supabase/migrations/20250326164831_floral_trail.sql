/*
  # Separate quality and energy level fields
  
  1. Changes
    - Add energy_level column to climbing_sessions table
    - Rename quality column to session_quality for clarity
    - Set default values for both fields
  
  2. Data Migration
    - Copy existing quality values to energy_level
*/

-- Rename quality column to session_quality
ALTER TABLE climbing_sessions
RENAME COLUMN quality TO session_quality;

-- Add energy_level column
ALTER TABLE climbing_sessions
ADD COLUMN energy_level integer DEFAULT 3 NOT NULL;

-- Copy existing session_quality values to energy_level for existing records
UPDATE climbing_sessions
SET energy_level = session_quality;

-- Add constraints for both fields
ALTER TABLE climbing_sessions
ADD CONSTRAINT session_quality_range CHECK (session_quality >= 1 AND session_quality <= 5),
ADD CONSTRAINT energy_level_range CHECK (energy_level >= 1 AND energy_level <= 5);