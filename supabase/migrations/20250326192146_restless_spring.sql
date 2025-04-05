/*
  # Update exercise categories

  1. Changes
    - Add 'power' as a valid exercise type
    - Update existing exercises to use proper categories
*/

-- Add 'power' to the valid exercise types
ALTER TABLE exercises
DROP CONSTRAINT exercises_type_check,
ADD CONSTRAINT exercises_type_check 
  CHECK (type IN ('strength', 'cardio', 'flexibility', 'technique', 'power'));

-- Update exercises to use proper categories
UPDATE exercises
SET type = 'power'
WHERE name IN (
  'Double Dynos',
  'Box Jumps',
  'Explosive Pull-ups',
  'Medicine Ball Throws',
  'Squat Jumps',
  'Clap Push-ups',
  'Campus Board Basic',
  'Power Pull-ups',
  'Plyometric Training',
  'Dynamic Moves',
  'Lock-off Pulls',
  'Campus Board Advanced',
  'Max Recruitment Pulls',
  'Explosive Campus Training',
  'Power Endurance Complex'
);