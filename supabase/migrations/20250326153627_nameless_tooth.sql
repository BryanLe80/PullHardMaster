/*
  # Add Weather API Key to Secure Storage

  1. New Table
    - `app_settings`: Stores application-wide settings
      - `key` (text, primary key): Setting identifier
      - `value` (text): Setting value
      - `created_at` (timestamp): Creation timestamp
      - `updated_at` (timestamp): Last update timestamp

  2. Security
    - Enable RLS on `app_settings` table
    - Add policy for authenticated users to read settings
    - Add policy for service role to manage settings
*/

-- Create app_settings table
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Allow authenticated users to read settings"
  ON app_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow service role to manage settings"
  ON app_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updating timestamp
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE
  ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();