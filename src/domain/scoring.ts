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

export const BAND_MULTIPLIER: Record<DifficultyBand, number> = {
  gentle: 1,
  tricky: 1.6,
  brutal: 2.4,
};

/** Share of the puzzle's value forfeited per wrong queen. */
const MISTAKE_COST = 0.08;

/** However bad it goes, finishing a hard board is worth something. */
const MIN_ACCURACY = 0.2;

export interface ScoredGame {
  gridSize: number;
  band: DifficultyBand;
  mistakes: number;
}

/** What a flawless solve of this puzzle pays. */
export const puzzleValue = (gridSize: number, band: DifficultyBand): number =>
  Math.round(BASE_POINTS_PER_QUEEN * gridSize * BAND_MULTIPLIER[band]);

export function scoreFor({ gridSize, band, mistakes }: ScoredGame): number {
  const accuracy = Math.max(MIN_ACCURACY, 1 - MISTAKE_COST * mistakes);
  return Math.round(puzzleValue(gridSize, band) * accuracy);
}
