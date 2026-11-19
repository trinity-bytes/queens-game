-- Scores priced by rating, a five-day board, and research data that outlives it.
--
-- SQLite cannot alter a CHECK or a foreign key in place, so each table is
-- rebuilt. The order matters: dropping a parent table runs an implicit DELETE
-- that fires ON DELETE CASCADE even with foreign keys deferred, so the two
-- private tables are detached from the board before the board is rebuilt.

PRAGMA defer_foreign_keys = on;

-- Research rows used to vanish with their run. A run now leaves the board
-- within five days, so the solve log keeps what calibrating the score needs
-- on its own: the rating, the board, and how the solve went.
CREATE TABLE leaderboard_solve_log_new (
  entry_id          TEXT    PRIMARY KEY,
  -- Null only for rows whose run had already left the board.
  win_id            TEXT    UNIQUE,
  grid_size         INTEGER,
  difficulty_score  INTEGER,
  time_ms           INTEGER,
  mistakes          INTEGER,
  moves_count       INTEGER,
  created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  -- JSON array of { atMs, correct }, one per queen placed.
  placements        TEXT    NOT NULL DEFAULT '[]',
  x_marks_placed    INTEGER NOT NULL DEFAULT 0,
  peak_x_marks      INTEGER NOT NULL DEFAULT 0,
  puzzles_abandoned INTEGER NOT NULL DEFAULT 0
);

INSERT INTO leaderboard_solve_log_new (
  entry_id, win_id, grid_size, difficulty_score, time_ms, mistakes,
  moves_count, created_at, placements, x_marks_placed, peak_x_marks,
  puzzles_abandoned
)
SELECT
  s.entry_id, l.win_id, l.grid_size, l.difficulty_score, l.time_ms,
  l.mistakes, l.moves_count,
  coalesce(l.created_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  s.placements, s.x_marks_placed, s.peak_x_marks, s.puzzles_abandoned
FROM leaderboard_solve_log s
LEFT JOIN leaderboard l ON l.id = s.entry_id;

DROP TABLE leaderboard_solve_log;
ALTER TABLE leaderboard_solve_log_new RENAME TO leaderboard_solve_log;

CREATE TABLE leaderboard_telemetry_new (
  entry_id          TEXT PRIMARY KEY,
  user_agent        TEXT,
  device_type       TEXT,
  device_local_time TEXT,
  app_version       TEXT
);

INSERT INTO leaderboard_telemetry_new
  (entry_id, user_agent, device_type, device_local_time, app_version)
SELECT entry_id, user_agent, device_type, device_local_time, app_version
FROM leaderboard_telemetry;

DROP TABLE leaderboard_telemetry;
ALTER TABLE leaderboard_telemetry_new RENAME TO leaderboard_telemetry;

-- The board itself: same columns, wider score range.
CREATE TABLE leaderboard_new (
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
  -- 2000 points per queen on a 12x12 board at the deepest rating it allows,
  -- one lookahead per cell: 2000 x 12 x (1 + 0.12 x 144).
  CONSTRAINT leaderboard_score_range CHECK (score BETWEEN 0 AND 438720),
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

INSERT INTO leaderboard_new (
  id, win_id, player_name, score, time_ms, mistakes, moves_count, grid_size,
  theme_used, locale, difficulty_band, difficulty_score, created_at
)
SELECT
  id, win_id, player_name, score, time_ms, mistakes, moves_count, grid_size,
  theme_used, locale, difficulty_band, difficulty_score, created_at
FROM leaderboard;

-- Takes its index and its trigger with it; both are recreated below.
DROP TABLE leaderboard;
ALTER TABLE leaderboard_new RENAME TO leaderboard;

-- The ranking query is `where grid_size = ? and created_at >= ?
-- order by score desc, time_ms asc`.
CREATE INDEX leaderboard_ranking_idx
  ON leaderboard (grid_size, score DESC, time_ms ASC);

-- The board shows the last five days, so it keeps moving: an old record
-- cannot hold a place forever. The read query applies the same window, so a
-- quiet week never shows stale runs; this trigger only reclaims the space.
-- The window must match BOARD_WINDOW in api/leaderboard/d1Repository.ts.
--
-- The best-100 bound stays, so a busy week cannot grow the table without
-- limit. Neither delete touches the research tables any more.
CREATE TRIGGER trigger_cleanup_leaderboard
AFTER INSERT ON leaderboard
BEGIN
  DELETE FROM leaderboard
  WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days');

  DELETE FROM leaderboard
  WHERE id NOT IN (
    SELECT id FROM leaderboard
    ORDER BY score DESC, time_ms ASC
    LIMIT 100
  );
END;
