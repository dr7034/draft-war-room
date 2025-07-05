-- Create players table if it doesn't exist
CREATE TABLE IF NOT EXISTS players (
  id text PRIMARY KEY,
  sleeper_id text UNIQUE NOT NULL,
  name text NOT NULL,
  position text NOT NULL,
  team text,
  status text,
  injury text,
  number text,
  experience integer DEFAULT 0,
  college text,
  projected_points decimal DEFAULT 0,
  adp decimal DEFAULT 999,
  tier integer DEFAULT 3,
  risk text DEFAULT 'medium',
  upside text DEFAULT 'medium',
  bye_week integer,
  stats jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read all players" ON players;
DROP POLICY IF EXISTS "Authenticated users can modify players" ON players;

-- Create policy for read access
CREATE POLICY "Users can read all players"
  ON players FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for insert/update access (you might want to restrict this to admins)
CREATE POLICY "Authenticated users can modify players"
  ON players FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true); 