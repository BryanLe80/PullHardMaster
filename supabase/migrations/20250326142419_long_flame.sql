/*
  # Add session quality tracking

  1. Changes
    - Add quality column to climbing_sessions table
      - `quality` (integer) - Rating from 1-5
      - Default value of 3 (average)
      - Not nullable
*/

ALTER TABLE climbing_sessions 
ADD COLUMN quality integer NOT NULL DEFAULT 3 
CHECK (quality >= 1 AND quality <= 5);