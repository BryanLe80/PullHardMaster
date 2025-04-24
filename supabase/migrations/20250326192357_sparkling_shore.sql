/*
  # Add endurance exercises and update categories

  1. Changes
    - Update exercise type check constraint to include 'endurance'
    - Add endurance exercises to the database
    - Update existing cardio exercises to endurance type

  2. Security
    - No changes to RLS policies needed
*/

-- Update type check constraint to include endurance
ALTER TABLE exercises
DROP CONSTRAINT exercises_type_check,
ADD CONSTRAINT exercises_type_check 
  CHECK (type IN ('strength', 'cardio', 'flexibility', 'technique', 'power', 'endurance'));

-- Update existing cardio exercises to endurance type
UPDATE exercises
SET type = 'endurance'
WHERE name IN (
  'Traversing',
  'Down Climbing',
  'Easy Boulder Circuits',
  'Hangboard Repeaters',
  'Jump Rope',
  'Power Endurance Circuits',
  '4x4s',
  'Linked Boulder Problems',
  'Campus Ladders',
  'System Board Intervals',
  'Campus Board Intervals',
  'Continuous Climbing',
  'Complex Boulder Circuits',
  'Power Endurance Links',
  'Anaerobic Capacity Training'
);

-- Insert new endurance exercises if they don't exist
INSERT INTO exercises (name, type, description)
SELECT name, type, description
FROM (VALUES
  ('Traversing', 'endurance', 'Continuous climbing horizontally across the wall to build endurance'),
  ('Down Climbing', 'endurance', 'Climbing down routes to increase time under tension'),
  ('Easy Boulder Circuits', 'endurance', 'Linking multiple easy boulder problems together'),
  ('Hangboard Repeaters', 'endurance', 'Repeated hangs on larger holds for endurance'),
  ('Jump Rope', 'endurance', 'Cardiovascular conditioning for climbing'),
  ('Power Endurance Circuits', 'endurance', 'High-intensity climbing circuits with minimal rest'),
  ('4x4s', 'endurance', 'Four boulder problems climbed four times each'),
  ('Linked Boulder Problems', 'endurance', 'Connecting multiple boulder problems in sequence'),
  ('Campus Ladders', 'endurance', 'Endurance-focused campus board exercises'),
  ('System Board Intervals', 'endurance', 'Timed intervals on the system board'),
  ('Campus Board Intervals', 'endurance', 'High-volume campus board training'),
  ('Continuous Climbing', 'endurance', 'Extended periods of non-stop climbing'),
  ('Complex Boulder Circuits', 'endurance', 'Advanced linking of boulder problems'),
  ('Power Endurance Links', 'endurance', 'Combining power moves with endurance circuits'),
  ('Anaerobic Capacity Training', 'endurance', 'High-intensity interval training for climbing')
) AS new_exercises(name, type, description)
WHERE NOT EXISTS (
  SELECT 1 FROM exercises WHERE exercises.name = new_exercises.name
);