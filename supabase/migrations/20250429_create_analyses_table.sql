-- Create analyses table for storing AI analysis results
CREATE TABLE IF NOT EXISTS analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL, -- e.g., 'draft_strategy', 'position_analysis', 'player_comparison'
  content text NOT NULL, -- The markdown content from the AI
  parameters jsonb DEFAULT '{}'::jsonb, -- The parameters used for the analysis
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  league_id text, -- Optional reference to a league
  draft_id text, -- Optional reference to a draft
  metadata jsonb DEFAULT '{}'::jsonb -- Any additional metadata
);

-- Enable RLS
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own analyses" ON analyses;
DROP POLICY IF EXISTS "Users can create analyses" ON analyses;

-- Create policy for read access
CREATE POLICY "Users can read their own analyses"
  ON analyses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Create policy for insert access
CREATE POLICY "Users can create analyses"
  ON analyses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Create index for faster querying
CREATE INDEX analyses_type_idx ON analyses (type);
CREATE INDEX analyses_user_id_idx ON analyses (user_id);
CREATE INDEX analyses_created_at_idx ON analyses (created_at DESC); 