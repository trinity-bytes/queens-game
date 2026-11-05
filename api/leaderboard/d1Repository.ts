import type { LeaderboardRepository, RankedRun } from "./repository";

/**
 * Columns the UI renders. Win ids, telemetry and solve logs stay in the
 * database: this list is what makes them private.
 */
const PUBLIC_COLUMNS =
  "id, player_name, score, time_ms, mistakes, moves_count, grid_size, created_at";

export function d1Repository(db: D1Database): LeaderboardRepository {
  return {
    async topScores(gridSize, limit) {
      const { results } = await db
        .prepare(
          `SELECT ${PUBLIC_COLUMNS} FROM leaderboard
           WHERE grid_size = ?
           ORDER BY score DESC, time_ms ASC
           LIMIT ?`,
        )
        .bind(gridSize, limit)
        .all<RankedRun>();
      return results;
    },

    async save(submission, userAgent) {
      const id = crypto.randomUUID();
      const { solveLog } = submission;

      // One batch is one transaction, so a run never exists without its
      // private rows. Those are guarded by EXISTS because the first statement
      // may store nothing: a replayed win id conflicts, and a run too low for
      // the board is removed again by the cleanup trigger.
      await db.batch([
        db
          .prepare(
            `INSERT INTO leaderboard (
               id, win_id, player_name, score, time_ms, mistakes, moves_count,
               grid_size, theme_used, locale, difficulty_band, difficulty_score
             )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            `INSERT INTO leaderboard_telemetry (
               entry_id, user_agent, device_type, device_local_time, app_version
             )
             SELECT ?1, ?2, ?3, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), ?4
             WHERE EXISTS (SELECT 1 FROM leaderboard WHERE id = ?1)`,
          )
          .bind(id, userAgent, submission.deviceType, submission.appVersion),
        db
          .prepare(
            `INSERT INTO leaderboard_solve_log (
               entry_id, placements, x_marks_placed, peak_x_marks, puzzles_abandoned
             )
             SELECT ?1, ?2, ?3, ?4, ?5
             WHERE EXISTS (SELECT 1 FROM leaderboard WHERE id = ?1)`,
          )
          .bind(
            id,
            JSON.stringify(solveLog.placements),
            solveLog.xMarksPlaced,
            solveLog.peakXMarks,
            solveLog.puzzlesAbandoned,
          ),
      ]);

      const stored = await db
        .prepare("SELECT id FROM leaderboard WHERE win_id = ?")
        .bind(submission.winId)
        .first<{ id: string }>();

      return stored?.id ?? null;
    },
  };
}
