/*
  # Add Example Climbs

  1. New Data
    - Add example climbs to the most recent session
    - Include a variety of styles and grades
    - Add detailed descriptions and notes
    - No photos (as requested)

  2. Changes
    - Insert climbs into the climbs table
    - Link climbs to existing session
*/

-- Add test climbs to the most recent session
WITH latest_session AS (
  SELECT cs.id, cs.user_id
  FROM climbing_sessions cs
  ORDER BY cs.date DESC
  LIMIT 1
)
INSERT INTO climbs (
  session_id,
  name,
  grade,
  style,
  attempts,
  completed,
  send_type,
  notes,
  description
)
SELECT
  latest_session.id,
  name,
  grade,
  style,
  attempts,
  completed,
  send_type,
  notes,
  description
FROM latest_session,
(VALUES
  (
    'The Nose',
    '5.11c',
    'sport',
    3,
    true,
    'redpoint',
    'Finally stuck that crux move! The beta is to use the small crimp on the left.',
    'Classic overhanging sport route with a challenging crux sequence'
  ),
  (
    'Finger Crack',
    '5.10a',
    'trad',
    2,
    true,
    'flash',
    'Perfect hand jams all the way up. Protected well with #2 cams.',
    'Beautiful sustained crack climb up the center of the wall'
  ),
  (
    'Dynamo',
    'V4',
    'boulder',
    5,
    false,
    'project',
    'Getting closer on the dyno move. Need more power.',
    'Powerful boulder problem with a big dyno to the finish hold'
  ),
  (
    'Crimper Heaven',
    '5.12a',
    'sport',
    1,
    false,
    'project',
    'Barely made it to the first bolt. This is going to be a project.',
    'Technical face climbing on tiny crimps'
  ),
  (
    'Slab Master',
    '5.9',
    'trad',
    1,
    true,
    'onsight',
    'Delicate slab climbing. Trust your feet!',
    'Classic slab route with minimal protection'
  )
) AS t(
  name,
  grade,
  style,
  attempts,
  completed,
  send_type,
  notes,
  description
)
WHERE EXISTS (SELECT 1 FROM latest_session);