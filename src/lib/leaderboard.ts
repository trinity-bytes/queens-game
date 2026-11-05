import type { Locale } from "./i18n";
import type { SolveLog } from "@/store/gameStore";
import type { DifficultyBand } from "@/workers/puzzleGenerator.types";

/**
 * Client for the leaderboard API (see api/leaderboard).
 *
 * The API re-validates every field and recomputes the score, so nothing here
 * should be treated as a check: it is transport, not enforcement.
 */

const ENDPOINT = "/api/leaderboard";

export interface LeaderboardEntry {
  id: string;
  player_name: string;
  time_ms: number;
  grid_size: number;
  mistakes: number;
  score: number;
  /** Null on rows migrated from before the move counter existed. */
  moves_count: number | null;
  created_at: string;
}

export interface ScoreSubmission {
  winId: string;
  playerName: string;
  score: number;
  timeMs: number;
  mistakes: number;
  movesCount: number;
  gridSize: number;
  themeUsed: string;
  locale: Locale;
  appVersion: string;
  /**
   * The puzzle's rating. Not decoration: the API recomputes the score
   * from the band and the mistake count and rejects anything that disagrees,
   * so this is what makes the submission checkable at all.
   */
  difficultyBand: DifficultyBand;
  difficultyScore: number;
  /** Behavioural record, kept for calibrating scoring against real play. */
  solveLog: SolveLog;
}

async function failureReason(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return body?.error ?? `HTTP ${response.status}`;
}

export async function fetchTopScores(
  limit: number,
): Promise<LeaderboardEntry[]> {
  const response = await fetch(`${ENDPOINT}?limit=${limit}`);
  if (!response.ok) throw new Error(await failureReason(response));
  return response.json();
}

/**
 * Submits a won game. Idempotent on winId: replaying the same submission
 * returns the original row instead of creating a second one.
 */
export async function submitScore(entry: ScoreSubmission): Promise<void> {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...entry,
      deviceType: window.innerWidth < 768 ? "mobile" : "desktop",
    }),
  });

  if (!response.ok) throw new Error(await failureReason(response));
}
