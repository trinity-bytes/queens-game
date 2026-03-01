-- Adds idempotency support for score submissions from the victory flow.
-- Run this migration in Supabase SQL editor.

ALTER TABLE leaderboard
ADD COLUMN IF NOT EXISTS win_id TEXT;

ALTER TABLE leaderboard
ADD COLUMN IF NOT EXISTS locale TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS leaderboard_win_id_unique
ON leaderboard (win_id)
WHERE win_id IS NOT NULL;
