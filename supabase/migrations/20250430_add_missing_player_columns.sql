-- Add missing columns to players table
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS number text,
  ADD COLUMN IF NOT EXISTS experience integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS college text,
  ADD COLUMN IF NOT EXISTS risk text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS upside text DEFAULT 'medium';

-- Update schema cache
NOTIFY pgrst, 'reload schema'; 