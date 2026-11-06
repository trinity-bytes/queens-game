/**
 * When a wrong queen becomes a mistake.
 *
 * A cell cycles empty → X → queen → empty, so the only way to clear an X is to
 * pass through a queen. Charging the moment a queen landed billed that as an
 * error: clearing three marks cost 24% of the puzzle's value.
 *
 * A queen is therefore only settled by the player's next move. If that move
 * takes the same cell on to empty, the queen was never really played. If it
 * touches any other cell, the queen stood, and a wrong one counts.
 */

export interface PendingQueen {
  index: number;
  correct: boolean;
}

export interface MistakeTally {
  mistakes: number;
  /** The queen placed by the last move, not settled yet. */
  pending: PendingQueen | null;
}

export interface SettledMove {
  tally: MistakeTally;
  /** The move took the pending queen off, so it was never really played. */
  passedThrough: boolean;
}

export const NO_MISTAKES: MistakeTally = { mistakes: 0, pending: null };

/**
 * @param index The cell this move acts on.
 * @param placed The queen this move puts on that cell, or null if it puts none.
 */
export function settleMove(
  { mistakes, pending }: MistakeTally,
  index: number,
  placed: { correct: boolean } | null,
): SettledMove {
  const passedThrough = pending?.index === index;
  const stood = pending !== null && !passedThrough && !pending.correct;

  return {
    tally: {
      mistakes: stood ? mistakes + 1 : mistakes,
      pending: placed ? { index, correct: placed.correct } : null,
    },
    passedThrough,
  };
}
