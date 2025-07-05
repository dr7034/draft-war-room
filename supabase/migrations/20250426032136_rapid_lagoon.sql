/*
  # Fantasy Football Draft Schema

  1. New Tables
    - `leagues`
      - League settings and metadata
      - Scoring rules and roster positions
    - `keepers`
      - Keeper player information and costs
    - `players`
      - Player metadata and stats
    - `drafts`
      - Draft state and settings
    - `draft_picks`
      - Individual draft picks
    - `teams`
      - Team rosters and metadata
    - `scoring_rules`
      - League-specific scoring settings

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create leagues table
CREATE TABLE IF NOT EXISTS leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sleeper_id text UNIQUE NOT NULL,
  name text NOT NULL,
  total_rosters int NOT NULL,
  status text NOT NULL,
  season text NOT NULL,
  owner_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  settings jsonb DEFAULT '{}'::jsonb,
  scoring_settings jsonb DEFAULT '{}'::jsonb,
  roster_positions text[] DEFAULT '{}'
);

-- Create keepers table
CREATE TABLE IF NOT EXISTS keepers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid REFERENCES leagues(id) ON DELETE CASCADE,
  player_id text NOT NULL,
  original_round int NOT NULL,
  keeper_round int NOT NULL,
  cost int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id text PRIMARY KEY,
  sleeper_id text UNIQUE,
  name text NOT NULL,
  position text NOT NULL,
  team text,
  projected_points decimal DEFAULT 0,
  adp decimal DEFAULT 999,
  tier int DEFAULT 3,
  bye_week int,
  injury text,
  stats jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Create drafts table
CREATE TABLE IF NOT EXISTS drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid REFERENCES leagues(id) ON DELETE CASCADE,
  sleeper_id text UNIQUE,
  status text NOT NULL,
  type text NOT NULL,
  start_time timestamptz,
  settings jsonb DEFAULT '{}'::jsonb,
  draft_order jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create draft_picks table
CREATE TABLE IF NOT EXISTS draft_picks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid REFERENCES drafts(id) ON DELETE CASCADE,
  player_id text REFERENCES players(id) ON DELETE CASCADE,
  pick_number int NOT NULL,
  round int NOT NULL,
  team_id uuid NOT NULL,
  picked_by uuid,
  picked_at timestamptz DEFAULT now()
);

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid REFERENCES leagues(id) ON DELETE CASCADE,
  name text NOT NULL,
  owner_id uuid,
  roster jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create scoring_rules table
CREATE TABLE IF NOT EXISTS scoring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid REFERENCES leagues(id) ON DELETE CASCADE,
  category text NOT NULL,
  points decimal NOT NULL,
  threshold decimal,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE keepers ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_rules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read all leagues"
  ON leagues FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can read all players"
  ON players FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can read their league's keepers"
  ON keepers FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM leagues l
    WHERE l.id = keepers.league_id
    AND l.owner_id = auth.uid()
  ));

CREATE POLICY "Users can read their league's drafts"
  ON drafts FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM leagues l
    WHERE l.id = drafts.league_id
    AND l.owner_id = auth.uid()
  ));

CREATE POLICY "Users can read their league's draft picks"
  ON draft_picks FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM drafts d
    JOIN leagues l ON l.id = d.league_id
    WHERE d.id = draft_picks.draft_id
    AND l.owner_id = auth.uid()
  ));

CREATE POLICY "Users can read their league's teams"
  ON teams FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM leagues l
    WHERE l.id = teams.league_id
    AND l.owner_id = auth.uid()
  ));

CREATE POLICY "Users can read their league's scoring rules"
  ON scoring_rules FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM leagues l
    WHERE l.id = scoring_rules.league_id
    AND l.owner_id = auth.uid()
  ));

-- Create functions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_leagues_updated_at
  BEFORE UPDATE ON leagues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_drafts_updated_at
  BEFORE UPDATE ON drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();