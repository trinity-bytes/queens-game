import type { Submission } from "./submission";

/** A ranked run, as the public board shows it. */
export interface RankedRun {
  id: string;
  player_name: string;
  score: number;
  time_ms: number;
  mistakes: number;
  moves_count: number | null;
  grid_size: number;
  created_at: string;
}

/** What the HTTP layer needs from storage, and all it may know about it. */
export interface LeaderboardRepository {
  topScores(gridSize: number, limit: number): Promise<RankedRun[]>;
  /**
   * Idempotent on the win id. Returns the id of the stored run, or null when
   * the run is valid but too low to make the board, so nothing was kept.
   */
  save(
    submission: Submission,
    userAgent: string | null,
  ): Promise<string | null>;
}
