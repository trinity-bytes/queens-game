// Human-style logical solver, used to rate how hard a layout actually is.
//
// The point is not to solve puzzles — hasUniqueSolution already does that by
// brute force, and far faster. The point is to solve them *the way a player
// does*, applying techniques in increasing order of effort, so the hardest
// technique a puzzle demands becomes a difficulty rating instead of a guess.
//
// The rules enforced here are the game's real ones: exactly one queen per row,
// column and region, and no two queens touching in any of the 8 directions.
// There is no shared-diagonal rule.

/** Techniques the solver knows, ordered by how much work they ask of a player. */
export const DIFFICULTY_TIERS = [
  "singles",
  "locking",
  "lookahead",
  "search",
] as const;

export type DifficultyTier = (typeof DIFFICULTY_TIERS)[number];

export interface SolveReport {
  /** The hardest technique the solve actually needed. */
  tier: DifficultyTier;
  /** How many deductions each technique contributed. */
  steps: Record<DifficultyTier, number>;
  /** False when the ladder stalled and only a search could finish the job. */
  solvedByLogic: boolean;
  /** Queen column per row, filled only when solvedByLogic is true. */
  solution: number[] | null;
}

interface State {
  size: number;
  regions: number[];
  /** 1 while a cell is still a possible queen. */
  cand: Uint8Array;
  /** Queen column per row, -1 while unplaced. */
  queenCol: Int32Array;
  rowDone: Uint8Array;
  colDone: Uint8Array;
  regionDone: Uint8Array;
  placed: number;
}

function createState(regions: number[], size: number): State {
  return {
    size,
    regions,
    cand: new Uint8Array(size * size).fill(1),
    queenCol: new Int32Array(size).fill(-1),
    rowDone: new Uint8Array(size),
    colDone: new Uint8Array(size),
    regionDone: new Uint8Array(size),
    placed: 0,
  };
}

function cloneState(state: State): State {
  return {
    size: state.size,
    regions: state.regions,
    cand: state.cand.slice(),
    queenCol: state.queenCol.slice(),
    rowDone: state.rowDone.slice(),
    colDone: state.colDone.slice(),
    regionDone: state.regionDone.slice(),
    placed: state.placed,
  };
}

/**
 * Commits a queen and clears everything it rules out: the rest of its row,
 * column and region, plus the ring of cells touching it.
 */
function place(state: State, row: number, col: number): void {
  const { size, regions, cand } = state;
  const region = regions[row * size + col];

  state.queenCol[row] = col;
  state.rowDone[row] = 1;
  state.colDone[col] = 1;
  state.regionDone[region] = 1;
  state.placed++;

  for (let c = 0; c < size; c++) cand[row * size + c] = 0;
  for (let r = 0; r < size; r++) cand[r * size + col] = 0;
  for (let i = 0; i < size * size; i++) if (regions[i] === region) cand[i] = 0;

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || r >= size || c < 0 || c >= size) continue;
      cand[r * size + c] = 0;
    }
  }
}

/** Cell indices still possible for a unit, or null once the unit has its queen. */
function unitCandidates(
  state: State,
  kind: "row" | "col" | "region",
  index: number,
): number[] | null {
  const { size, regions, cand } = state;

  if (kind === "row") {
    if (state.rowDone[index]) return null;
    const cells: number[] = [];
    for (let c = 0; c < size; c++) {
      if (cand[index * size + c]) cells.push(index * size + c);
    }
    return cells;
  }

  if (kind === "col") {
    if (state.colDone[index]) return null;
    const cells: number[] = [];
    for (let r = 0; r < size; r++) {
      if (cand[r * size + index]) cells.push(r * size + index);
    }
    return cells;
  }

  if (state.regionDone[index]) return null;
  const cells: number[] = [];
  for (let i = 0; i < size * size; i++) {
    if (regions[i] === index && cand[i]) cells.push(i);
  }
  return cells;
}

/** A unit still waiting for a queen with nowhere left to put one is dead. */
function hasContradiction(state: State): boolean {
  const kinds = ["row", "col", "region"] as const;
  for (const kind of kinds) {
    for (let i = 0; i < state.size; i++) {
      const cells = unitCandidates(state, kind, i);
      if (cells !== null && cells.length === 0) return true;
    }
  }
  return false;
}

/**
 * Tier 1 — a row, column or region with exactly one square left. The queen
 * goes there; no choice is involved. Runs to exhaustion.
 */
function applySingles(state: State): { steps: number; contradiction: boolean } {
  let steps = 0;
  const kinds = ["row", "col", "region"] as const;

  for (;;) {
    let progressed = false;

    for (const kind of kinds) {
      for (let i = 0; i < state.size; i++) {
        const cells = unitCandidates(state, kind, i);
        if (cells === null) continue;
        if (cells.length === 0) return { steps, contradiction: true };
        if (cells.length !== 1) continue;

        place(state, Math.floor(cells[0] / state.size), cells[0] % state.size);
        steps++;
        progressed = true;
      }
    }

    if (!progressed) return { steps, contradiction: hasContradiction(state) };
  }
}

/**
 * Tier 2 — locking. If a region can only sit in one row, that row belongs to
 * it and every other region's square in that row is out. And the mirror: if a
 * row can only be served by one region, that region's squares elsewhere are
 * out. The player reasons about whole units without placing anything.
 */
function applyLocking(state: State): { steps: number; contradiction: boolean } {
  const { size, regions, cand } = state;
  let steps = 0;

  const eliminate = (cells: number[]): void => {
    for (const i of cells) {
      if (cand[i]) {
        cand[i] = 0;
        steps++;
      }
    }
  };

  // A region confined to a single line claims that line.
  for (let region = 0; region < size; region++) {
    const cells = unitCandidates(state, "region", region);
    if (cells === null || cells.length === 0) continue;

    const rows = new Set(cells.map((i) => Math.floor(i / size)));
    if (rows.size === 1) {
      const row = Math.floor(cells[0] / size);
      const doomed: number[] = [];
      for (let c = 0; c < size; c++) {
        const i = row * size + c;
        if (cand[i] && regions[i] !== region) doomed.push(i);
      }
      eliminate(doomed);
    }

    const cols = new Set(cells.map((i) => i % size));
    if (cols.size === 1) {
      const col = cells[0] % size;
      const doomed: number[] = [];
      for (let r = 0; r < size; r++) {
        const i = r * size + col;
        if (cand[i] && regions[i] !== region) doomed.push(i);
      }
      eliminate(doomed);
    }
  }

  // A line served by a single region confines that region to the line.
  const lines = ["row", "col"] as const;
  for (const kind of lines) {
    for (let index = 0; index < size; index++) {
      const cells = unitCandidates(state, kind, index);
      if (cells === null || cells.length === 0) continue;

      const spanned = new Set(cells.map((i) => regions[i]));
      if (spanned.size !== 1) continue;

      const region = regions[cells[0]];
      if (state.regionDone[region]) continue;

      const keep = new Set(cells);
      const doomed: number[] = [];
      for (let i = 0; i < size * size; i++) {
        if (cand[i] && regions[i] === region && !keep.has(i)) doomed.push(i);
      }
      eliminate(doomed);
    }
  }

  return { steps, contradiction: steps > 0 && hasContradiction(state) };
}

/**
 * Tier 3 — one square of lookahead. Drop a queen on a candidate, follow the
 * forced consequences, and if some unit ends up with nowhere to go, that
 * square was never possible. This is the "if I put it here, that region dies"
 * move, and it is where a puzzle stops being comfortable.
 *
 * Returns after a single elimination so the tier that made progress stays
 * honestly attributed.
 */
function applyLookahead(state: State): { steps: number } {
  const { size, cand } = state;

  for (let i = 0; i < size * size; i++) {
    if (!cand[i]) continue;

    const trial = cloneState(state);
    place(trial, Math.floor(i / size), i % size);

    const refuted =
      hasContradiction(trial) || applySingles(trial).contradiction;

    if (refuted) {
      cand[i] = 0;
      return { steps: 1 };
    }
  }

  return { steps: 0 };
}

/**
 * Rates a layout by solving it the way a player would.
 *
 * The caller is expected to have already established that the layout has
 * exactly one solution; on such a layout every deduction below is sound, so a
 * contradiction can only mean the input was not unique after all.
 */
export function rateDifficulty(regions: number[], size: number): SolveReport {
  const state = createState(regions, size);
  const steps: Record<DifficultyTier, number> = {
    singles: 0,
    locking: 0,
    lookahead: 0,
    search: 0,
  };

  let hardest = 0;

  for (;;) {
    const single = applySingles(state);
    steps.singles += single.steps;
    if (single.contradiction) break;

    if (state.placed === size) {
      return {
        tier: DIFFICULTY_TIERS[hardest],
        steps,
        solvedByLogic: true,
        solution: Array.from(state.queenCol),
      };
    }

    if (single.steps > 0) continue;

    const locking = applyLocking(state);
    if (locking.steps > 0) {
      steps.locking += locking.steps;
      hardest = Math.max(hardest, 1);
      if (locking.contradiction) break;
      continue;
    }

    const lookahead = applyLookahead(state);
    if (lookahead.steps > 0) {
      steps.lookahead += lookahead.steps;
      hardest = Math.max(hardest, 2);
      continue;
    }

    break;
  }

  return { tier: "search", steps, solvedByLogic: false, solution: null };
}
