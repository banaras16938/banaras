-- Add is_self column to players table
-- This column is used to identify player records created for staff self-bets
-- When a staff member places a bet under their own name, a player record with is_self=true is created

ALTER TABLE players ADD COLUMN IF NOT EXISTS is_self BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups of self-players
CREATE INDEX IF NOT EXISTS idx_players_is_self ON players(created_by, is_self) WHERE is_self = true;
