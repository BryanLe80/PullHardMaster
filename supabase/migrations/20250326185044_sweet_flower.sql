/*
  # Add workoutDays column to training_plans table

  1. Changes
    - Add workoutDays column to training_plans table
      - Integer type
      - Not nullable
      - Default value of 3
      - Check constraint to ensure value is between 1 and 7
*/

ALTER TABLE training_plans
ADD COLUMN workout_days integer NOT NULL DEFAULT 3
CHECK (workout_days BETWEEN 1 AND 7);