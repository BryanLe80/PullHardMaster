/*
  # Add Test Climbing Data

  1. Changes
    - Insert test climbing sessions
    - Insert test climbs with various styles and grades
    - Insert test photos for climbs
*/

-- Create test climbing sessions
WITH user_data AS (
  SELECT id FROM auth.users WHERE email = 'test@example.com' LIMIT 1
)
INSERT INTO climbing_sessions (user_id, location, date, energy_level, session_quality, notes)
SELECT 
  user_data.id,
  location,
  date,
  energy_level,
  session_quality,
  notes
FROM user_data,
(VALUES
  ('Red River Gorge', now(), 4, 5, 'Great conditions today!'),
  ('New River Gorge', now() - interval '2 days', 3, 4, 'Bit humid but still good climbing')
) AS t(location, date, energy_level, session_quality, notes)
WHERE EXISTS (SELECT 1 FROM user_data);

-- Add test climbs
WITH latest_session AS (
  SELECT cs.id, cs.user_id
  FROM climbing_sessions cs
  JOIN auth.users u ON u.id = cs.user_id
  WHERE u.email = 'test@example.com'
  ORDER BY cs.date DESC
  LIMIT 1
)
INSERT INTO climbs (session_id, name, grade, style, attempts, completed, send_type, notes, description)
SELECT
  latest_session.id,
  climb_name,
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
    'Sunshine', '5.10a', 'sport', 2, true, 'redpoint',
    'Stuck on the crux for a while but finally got it!',
    'Beautiful line up the orange face with technical moves'
  ),
  (
    'Black Diamond', '5.11b', 'sport', 3, false, 'project',
    'Need to work on the roof sequence',
    'Steep roof climb with powerful moves'
  ),
  (
    'Crack Attack', '5.9', 'trad', 1, true, 'flash',
    'Clean ascent, felt solid',
    'Classic hand crack up the center of the wall'
  ),
  (
    'Boulder Beast', 'V5', 'boulder', 5, true, 'redpoint',
    'Finally stuck the dyno!',
    'Dynamic moves to a sloper finish'
  )
) AS t(climb_name, grade, style, attempts, completed, send_type, notes, description)
WHERE EXISTS (SELECT 1 FROM latest_session);

-- Add test photos
WITH test_climb AS (
  SELECT c.id
  FROM climbs c
  JOIN climbing_sessions cs ON cs.id = c.session_id
  JOIN auth.users u ON u.id = cs.user_id
  WHERE u.email = 'test@example.com'
  AND c.name = 'Sunshine'
  LIMIT 1
)
INSERT INTO climb_photos (climb_id, url, description)
SELECT
  test_climb.id,
  'https://images.unsplash.com/photo-1522163182402-834f871fd851',
  'First bolt to anchors'
FROM test_climb
WHERE EXISTS (SELECT 1 FROM test_climb);