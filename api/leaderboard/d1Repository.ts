import type { LeaderboardRepository, RankedRun } from "./repository";

/**
 * Columns the UI renders. Win ids, telemetry and solve logs stay in the
 * database: this list is what makes them private.
 */
const PUBLIC_COLUMNS =
  "id, player_name, score, time_ms, mistakes, moves_count, grid_size, created_at";

/**
 * How far back the board looks, as an SQLite date modifier. Must match the
 * cleanup trigger in migrations/0002_rating_scores_and_rolling_board.sql.
 */
const BOARD_WINDOW = "-5 days";

export function d1Repository(db: D1Database): LeaderboardRepository {
  return {
    async topScores(gridSize, limit) {
      const { results } = await db
        .prepare(
          `SELECT ${PUBLIC_COLUMNS} FROM leaderboard
           WHERE grid_size = ?
             AND created_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', ?)
           ORDER BY score DESC, time_ms ASC
           LIMIT ?`,
        )
        .bind(gridSize, BOARD_WINDOW, limit)
        .all<RankedRun>();
      return results;
    },

    async save(submission, userAgent) {
      const id = crypto.randomUUID();
      const { solveLog } = submission;

      // One batch is one transaction. The solve log is written for every
      // new win, on the board or not: it is research data, and a run too low
      // for the board is as useful for calibrating as one at the top. Its
      // unique win id makes a replay a no-op, and telemetry follows it.
      await db.batch([
        db
          .prepare(
            `INSERT INTO leaderboard (
               id, win_id, player_name, score, time_ms, mistakes, moves_count,
               grid_size, theme_used, locale, difficulty_band, difficulty_score
             )
             SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12
             -- A win that already left the board is still known by its solve
             -- log, so replaying it cannot bring it back with a fresh date.
             WHERE NOT EXISTS (
               SELECT 1 FROM leaderboard_solve_log WHERE win_id = ?2
             )
             ON CONFLICT (win_id) DO NOTHING`,
          )
          .bind(
            id,
            submission.winId,
            submission.playerName,
            submission.score,
            submission.timeMs,
            submission.mistakes,
            submission.movesCount,
            submission.gridSize,
            submission.themeUsed,
            submission.locale,
            submission.difficultyBand,
            submission.difficultyScore,
          ),
        db
          .prepare(
            `INSERT INTO leaderboard_solve_log (
               entry_id, win_id, grid_size, difficulty_score, time_ms,
               mistakes, moves_count, placements, x_marks_placed,
               peak_x_marks, puzzles_abandoned
             )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT (win_id) DO NOTHING`,
          )
          .bind(
            id,
            submission.winId,
            submission.gridSize,
            submission.difficultyScore,
            submission.timeMs,
            submission.mistakes,
            submission.movesCount,
            JSON.stringify(solveLog.placements),
            solveLog.xMarksPlaced,
            solveLog.peakXMarks,
            solveLog.puzzlesAbandoned,
          ),
        db
          .prepare(
            `INSERT INTO leaderboard_telemetry (
               entry_id, user_agent, device_type, device_local_time, app_version
             )
             SELECT ?1, ?2, ?3, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), ?4
             WHERE EXISTS (SELECT 1 FROM leaderboard_solve_log WHERE entry_id = ?1)`,
          )
          .bind(id, userAgent, submission.deviceType, submission.appVersion),
      ]);

      const stored = await db
        .prepare("SELECT id FROM leaderboard WHERE win_id = ?")
        .bind(submission.winId)
        .first<{ id: string }>();

      return stored?.id ?? null;
    },
  };
}
