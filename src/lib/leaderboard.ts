import { supabase } from "./supabase";
import type { Locale } from "./i18n";

/**
 * Data access for the leaderboard.
 *
 * Reads are plain selects over the public columns. Writes go through the
 * submit_score() database function, which is the only thing allowed to insert:
 * the client has no INSERT grant on the table. Every field is re-validated
 * server-side there, so nothing here should be treated as a check — it is
 * transport, not enforcement.
 */

/**
 * Columns the UI actually renders. Telemetry (user agent, device type) lives
 * in a separate table the client cannot read.
 */
const PUBLIC_COLUMNS =
  "id, player_name, score, time_ms, mistakes, moves_count, grid_size, created_at";

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
  themeUsed: string;
  locale: Locale;
  appVersion: string;
}

export async function fetchTopScores(
  limit: number,
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from("leaderboard")
    .select(PUBLIC_COLUMNS)
    .eq("grid_size", 9)
    .order("score", { ascending: false })
    .order("time_ms", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data as LeaderboardEntry[] | null) ?? [];
}

/** Subscribes to new scores. Returns the unsubscribe function. */
export function subscribeToNewScores(
  onInsert: (entry: LeaderboardEntry) => void,
): () => void {
  const channel = supabase
    .channel("public:leaderboard")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "leaderboard" },
      (payload) => onInsert(payload.new as LeaderboardEntry),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Submits a won game. Idempotent on winId: replaying the same submission
 * returns the original row instead of creating a second one.
 */
export async function submitScore(entry: ScoreSubmission): Promise<void> {
  const { error } = await supabase.rpc("submit_score", {
    p_win_id: entry.winId,
    p_player_name: entry.playerName,
    p_score: entry.score,
    p_time_ms: entry.timeMs,
    p_mistakes: entry.mistakes,
    p_moves_count: entry.movesCount,
    p_theme_used: entry.themeUsed,
    p_locale: entry.locale,
    p_user_agent: navigator.userAgent,
    p_device_type: window.innerWidth < 768 ? "mobile" : "desktop",
    p_app_version: entry.appVersion,
  });

  if (error) throw error;
}
