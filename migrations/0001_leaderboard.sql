-- Leaderboard schema.
--
-- The Worker validates every submission first, so these constraints are the
-- second line: they hold even if a future code path forgets to go through it.
-- There is no RLS because the client never reaches this database; the Worker
-- is the only thing that can, and it exposes only the public columns.

CREATE TABLE leaderboard (
  id               TEXT    PRIMARY KEY,
  win_id           TEXT    NOT NULL UNIQUE,
  player_name      TEXT    NOT NULL,
  score            INTEGER NOT NULL,
  time_ms          INTEGER NOT NULL,
  mistakes         INTEGER NOT NULL DEFAULT 0,
  -- Nullable on purpose: rows that predate move tracking carry no real value,
  -- and "unknown" is more honest than a fabricated one.
  moves_count      INTEGER,
  grid_size        INTEGER NOT NULL DEFAULT 9,
  theme_used       TEXT    NOT NULL,
  locale           TEXT    NOT NULL DEFAULT 'es',
  -- Nullable for rows that predate the difficulty rating.
  difficulty_band  TEXT,
  difficulty_score INTEGER,
  created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

  CONSTRAINT leaderboard_name_len CHECK (length(player_name) BETWEEN 1 AND 15),
  -- 2000 points per queen at the top band multiplier of 2.4 on a 12x12 board.
  CONSTRAINT leaderboard_score_range CHECK (score BETWEEN 0 AND 57600),
  CONSTRAINT leaderboard_time_range CHECK (
    time_ms > 0 AND time_ms <= 3600000 AND time_ms % 1000 = 0
  ),
  CONSTRAINT leaderboard_grid_range CHECK (grid_size BETWEEN 4 AND 12),
  CONSTRAINT leaderboard_moves_range CHECK (
    moves_count IS NULL OR moves_count BETWEEN grid_size AND 5000
  ),
  CONSTRAINT leaderboard_mistakes_ok CHECK (
    mistakes >= 0 AND (moves_count IS NULL OR mistakes <= moves_count)
  ),
  CONSTRAINT leaderboard_win_id_len CHECK (length(win_id) BETWEEN 5 AND 64)
);

-- The ranking query is `where grid_size = ? order by score desc, time_ms asc`.
CREATE INDEX leaderboard_ranking_idx
  ON leaderboard (grid_size, score DESC, time_ms ASC);

-- Private: no API route reads this table.
CREATE TABLE leaderboard_telemetry (
  entry_id          TEXT PRIMARY KEY
                      REFERENCES leaderboard (id) ON DELETE CASCADE,
  user_agent        TEXT,
  device_type       TEXT,
  device_local_time TEXT,
  app_version       TEXT
);

-- Private research data for calibrating scoring, never displayed.
CREATE TABLE leaderboard_solve_log (
  entry_id          TEXT    PRIMARY KEY
                      REFERENCES leaderboard (id) ON DELETE CASCADE,
  -- JSON array of { atMs, correct }, one per queen placed.
  placements        TEXT    NOT NULL DEFAULT '[]',
  x_marks_placed    INTEGER NOT NULL DEFAULT 0,
  peak_x_marks      INTEGER NOT NULL DEFAULT 0,
  puzzles_abandoned INTEGER NOT NULL DEFAULT 0
);

-- The board keeps the best 100 runs. A trigger rather than application code,
-- so the bound holds for every writer.
CREATE TRIGGER trigger_cleanup_leaderboard
AFTER INSERT ON leaderboard
BEGIN
  DELETE FROM leaderboard
  WHERE id NOT IN (
    SELECT id FROM leaderboard
    ORDER BY score DESC, time_ms ASC
    LIMIT 100
  );
END;
