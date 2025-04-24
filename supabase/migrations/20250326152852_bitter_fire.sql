/*
  # Add location coordinates

  1. Changes
    - Add latitude and longitude columns to climbing_sessions table
    - Add check constraints to ensure valid coordinates

  2. Security
    - No changes to RLS policies needed
*/

ALTER TABLE climbing_sessions
ADD COLUMN latitude numeric(10,8),
ADD COLUMN longitude numeric(11,8),
ADD CONSTRAINT valid_latitude CHECK (latitude >= -90 AND latitude <= 90),
ADD CONSTRAINT valid_longitude CHECK (longitude >= -180 AND longitude <= 180);