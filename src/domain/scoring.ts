import type { DifficultyBand } from "../workers/puzzleGenerator.types";

/**
 * The score formula, shared by the game and the API: the browser computes it
 * to show the player, the Worker recomputes it to reject anything else. Both
 * import this module, so the two can never disagree.
 *
 * It stays free of browser and Worker APIs for that reason.
 */

/**
 * Scoring.
 *
 * The old engine paid per queen for speed: a bonus that expired after five
 * seconds, a combo that reset after five, a final bonus that vanished after
 * 135, and a fine for leaving an X on the board more than two. Every one of
 * them was a proxy for skill, chosen when nothing could measure how hard a
 * puzzle actually was. All four punished the player for thinking, and none of
 * them knew the difference between a board solved on sight and one that took
 * real deduction — so reloading until an easy puzzle appeared was the single
 * most profitable strategy in the game.
 *
 * Difficulty is measurable now, so it carries the reward instead. A puzzle is
 * worth what its rating says, reduced by the queens the player got wrong.
 * Rerolling for an easy board lowers your own ceiling, which retires the
 * exploit without needing to detect it.
 *
 * Time is deliberately absent. It is the sharpest skill signal there is, but
 * only against a reference for how long a given rating *should* take, and that
 * reference does not exist yet — SolveLog is being collected to build it.
 * Inventing the constant now would just be the old bias with new arithmetic.
 */
const BASE_POINTS_PER_QUEEN = 2000;

/**
 * Each lookahead a puzzle demands adds 12% to its value. Bands used to set the
 * value in three steps, which left most flawless solves tied at the top one;
 * a continuous rating keeps two brutal boards of different depth apart.
 *
 * Uncapped on purpose: a lookahead rules a cell out, so a board can need at
 * most one per cell, and that is the bound the API enforces.
 */
const PERCENT_PER_LOOKAHEAD = 12;

/** Share of the puzzle's value forfeited per wrong queen, in percent. */
const MISTAKE_COST_PERCENT = 8;

/** However bad it goes, finishing a hard board is worth something. */
const MIN_ACCURACY_PERCENT = 20;

/**
 * Lowest rating of each band. The bands no longer price a puzzle; they name
 * it, so a player can tell a brutal board from a gentle one at a glance.
 */
export const BAND_FLOOR: Record<DifficultyBand, number> = {
  gentle: 0,
  tricky: 7,
  brutal: 12,
};

/**
 * Cut points for the player-facing bands, taken from the measured
 * distribution of layouts that clear the generation floor: they split it into
 * rough thirds at size 9 (31% / 33% / 36%).
 */
export function bandFor(lookaheads: number): DifficultyBand {
  if (lookaheads >= BAND_FLOOR.brutal) return "brutal";
  if (lookaheads >= BAND_FLOOR.tricky) return "tricky";
  return "gentle";
}

/** The most lookaheads a board of this size can demand: one per cell. */
export const maxRating = (gridSize: number): number => gridSize * gridSize;

/** The value multiplier, in percent, so the arithmetic stays in integers. */
const multiplierPercent = (rating: number): number =>
  100 + PERCENT_PER_LOOKAHEAD * rating;

/** The multiplier as the victory screen shows it. */
export const ratingMultiplier = (rating: number): number =>
  multiplierPercent(rating) / 100;

export interface ScoredGame {
  gridSize: number;
  /** The puzzle's difficulty rating: how many lookaheads it demands. */
  rating: number;
  mistakes: number;
}

/** What a flawless solve of this puzzle pays. */
export const puzzleValue = (gridSize: number, rating: number): number =>
  (BASE_POINTS_PER_QUEEN * gridSize * multiplierPercent(rating)) / 100;

export function scoreFor({ gridSize, rating, mistakes }: ScoredGame): number {
  const accuracy = Math.max(
    MIN_ACCURACY_PERCENT,
    100 - MISTAKE_COST_PERCENT * mistakes,
  );
  return Math.round((puzzleValue(gridSize, rating) * accuracy) / 100);
}
