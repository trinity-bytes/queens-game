// Pure puzzle generation. Split out of the worker so the same code can run
// off the main thread in the browser and directly under Node in a measurement
// harness — the worker itself is now only a message shim.

import type {
  GenerationFailure,
  GenerationPhase,
  GenerationResult,
  GenerationSuccess,
  PhaseStats,
  PuzzleDifficulty,
} from "./puzzleGenerator.types";
// Explicit extension so the same module resolves both under Turbopack and
// under `node --experimental-strip-types`, which does no resolution of its own
// and is how scripts/measure-difficulty.ts reaches this code.
import {
  MIN_INTERESTING_LOOKAHEADS,
  bandFor,
  rateDifficulty,
} from "./puzzleSolver.ts";

/**
 * Checks a queen against the ones already placed, under the rules the game
 * actually enforces: one queen per row and column, and no two queens touching.
 *
 * There is deliberately no full-diagonal test here. The win condition in
 * gameStore only forbids 8-way adjacency, and a seed generator that also
 * banned shared diagonals was solving a stricter puzzle than the one it
 * shipped: enumerating all 362,880 column permutations for a 9x9 board gives
 * 47,622 layouts legal under the game's rules, of which only 352 are
 * diagonal-free. Every puzzle ever generated came from that 0.74% — so a
 * player who assumed "two queens never share a diagonal" had a free rule the
 * game never taught and could never be punished for using.
 *
 * The adjacency test below was dead code under the old diagonal rule (no
 * permutation is diagonal-free and adjacent, verified by the same
 * enumeration). It is the only spacing constraint now.
 */
function isValidQueenPlacement(
  board: number[],
  row: number,
  col: number,
): boolean {
  for (let r = 0; r < row; r++) {
    const c = board[r];
    // Column conflict
    if (c === col) return false;
    // 8-way adjacency: no two queens touching (includes diagonal neighbors)
    if (Math.abs(r - row) <= 1 && Math.abs(c - col) <= 1) return false;
  }
  return true;
}

// Generate a valid seed of N queens with 8-way adjacency constraint
function generateSeed(size: number): number[] | null {
  const board = new Array(size).fill(-1);

  function solve(row: number): boolean {
    if (row === size) return true;

    // Shuffle columns for randomness
    const cols = Array.from({ length: size }, (_, i) => i);
    for (let i = cols.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cols[i], cols[j]] = [cols[j], cols[i]];
    }

    for (const col of cols) {
      if (isValidQueenPlacement(board, row, col)) {
        board[row] = col;
        if (solve(row + 1)) return true;
        board[row] = -1;
      }
    }
    return false;
  }

  return solve(0) ? board : null;
}

// Generate regions by random cell-by-cell painting from queen seeds
function generateRegions(seed: number[], size: number): number[] {
  const regions = new Array(size * size).fill(-1);
  const dirs: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  const inBounds = (r: number, c: number) =>
    r >= 0 && r < size && c >= 0 && c < size;

  // Phase A — Seed each queen's cell with its region ID
  const queue: { r: number; c: number; id: number }[] = [];
  for (let i = 0; i < size; i++) {
    const r = i;
    const c = seed[i];
    regions[r * size + c] = i;
    queue.push({ r, c, id: i });
  }

  // Shuffle queue for organic region shapes
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }

  // Phase B — Randomized BFS flood-fill to assign all cells
  while (queue.length > 0) {
    const idx = Math.floor(Math.random() * queue.length);
    const { r, c, id } = queue.splice(idx, 1)[0];

    // Shuffle directions for varied growth patterns
    const shuffledDirs = [...dirs];
    for (let i = shuffledDirs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledDirs[i], shuffledDirs[j]] = [shuffledDirs[j], shuffledDirs[i]];
    }

    for (const [dr, dc] of shuffledDirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(nr, nc) && regions[nr * size + nc] === -1) {
        regions[nr * size + nc] = id;
        queue.push({ r: nr, c: nc, id });
      }
    }
  }

  // Phase C — Perturbation: randomly reassign boundary cells between regions
  // to create more irregular, organic shapes (like random painting)

  // Helper: check if removing cellIdx from its region keeps the region connected
  const isRemovable = (cellIdx: number, regionId: number): boolean => {
    // Quick check: count same-region neighbors of this cell
    const cr = Math.floor(cellIdx / size);
    const cc = cellIdx % size;
    let sameRegionNeighbors = 0;
    for (const [dr, dc] of dirs) {
      const nr = cr + dr;
      const nc = cc + dc;
      if (inBounds(nr, nc) && regions[nr * size + nc] === regionId) {
        sameRegionNeighbors++;
      }
    }
    // Leaf node (0-1 same-region neighbors): always safe to remove
    if (sameRegionNeighbors <= 1) return true;

    // 2+ neighbors: might be a bridge — do full BFS connectivity check
    const regionCells: number[] = [];
    for (let k = 0; k < size * size; k++) {
      if (regions[k] === regionId && k !== cellIdx) regionCells.push(k);
    }
    if (regionCells.length === 0) return false;

    const visited = new Set<number>();
    const bfsQueue = [regionCells[0]];
    visited.add(regionCells[0]);
    while (bfsQueue.length > 0) {
      const cur = bfsQueue.pop()!;
      const br = Math.floor(cur / size);
      const bc = cur % size;
      for (const [dr, dc] of dirs) {
        const nr = br + dr;
        const nc = bc + dc;
        const nIdx = nr * size + nc;
        if (
          inBounds(nr, nc) &&
          nIdx !== cellIdx &&
          regions[nIdx] === regionId &&
          !visited.has(nIdx)
        ) {
          visited.add(nIdx);
          bfsQueue.push(nIdx);
        }
      }
    }
    return visited.size === regionCells.length;
  };

  // Phase B2 — Repair regions the flood fill boxed in.
  //
  // When every 4-neighbour of a queen's cell is claimed by another region
  // first, that region ends up holding only the queen. The caller used to
  // throw the whole layout away for it, and it happens to just under a third
  // of candidates — the single largest source of wasted generation work.
  // Growing the region from a neighbour that can spare a cell recovers all of
  // it. Regions of exactly 2 are never donors, so a repair cannot create the
  // problem it is fixing.
  const regionCounts = new Array(size).fill(0);
  for (const id of regions) regionCounts[id]++;

  for (let id = 0; id < size; id++) {
    while (regionCounts[id] < 2) {
      let donated = false;

      for (let k = 0; k < size * size && !donated; k++) {
        if (regions[k] !== id) continue;
        const kr = Math.floor(k / size);
        const kc = k % size;

        for (const [dr, dc] of dirs) {
          const nr = kr + dr;
          const nc = kc + dc;
          if (!inBounds(nr, nc)) continue;

          const nIdx = nr * size + nc;
          const donor = regions[nIdx];
          if (donor === id) continue;
          if (regionCounts[donor] <= 2) continue;
          if (seed[nr] === nc) continue; // a queen never leaves its region
          if (!isRemovable(nIdx, donor)) continue;

          regions[nIdx] = id;
          regionCounts[donor]--;
          regionCounts[id]++;
          donated = true;
          break;
        }
      }

      // Nothing adjacent can spare a cell. Rare, and the size guard in the
      // search loop still catches it.
      if (!donated) break;
    }
  }

  const perturbPasses = 1 + Math.floor(Math.random() * 2); // 1-2 passes
  for (let pass = 0; pass < perturbPasses; pass++) {
    // Collect boundary cells (cells with at least one 4-neighbor in different region)
    const boundary: number[] = [];
    for (let idx = 0; idx < size * size; idx++) {
      const r = Math.floor(idx / size);
      const c = idx % size;
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (inBounds(nr, nc) && regions[nr * size + nc] !== regions[idx]) {
          boundary.push(idx);
          break;
        }
      }
    }

    // Shuffle and try to reassign each boundary cell
    for (let i = boundary.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [boundary[i], boundary[j]] = [boundary[j], boundary[i]];
    }

    for (const idx of boundary) {
      // Don't move queen cells
      const r = Math.floor(idx / size);
      const c = idx % size;
      const isQueen = seed[r] === c;
      if (isQueen) continue;

      // Only reassign with 40% probability for controlled perturbation
      if (Math.random() > 0.4) continue;

      const currentRegion = regions[idx];

      // Collect neighboring regions (different from current)
      const neighborRegions = new Set<number>();
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (inBounds(nr, nc) && regions[nr * size + nc] !== currentRegion) {
          neighborRegions.add(regions[nr * size + nc]);
        }
      }
      if (neighborRegions.size === 0) continue;

      // Check: if we remove this cell, would the source region still have ≥2 cells?
      let sourceCount = 0;
      for (let k = 0; k < size * size; k++) {
        if (regions[k] === currentRegion) sourceCount++;
      }
      if (sourceCount <= 2) continue; // Keep minimum 2 cells per region

      // Check: would this cell still be connected to the new region?
      const candidates = Array.from(neighborRegions);
      const targetRegion =
        candidates[Math.floor(Math.random() * candidates.length)];

      // Verify the cell has at least one neighbor in the target region
      let hasTargetNeighbor = false;
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (inBounds(nr, nc) && regions[nr * size + nc] === targetRegion) {
          hasTargetNeighbor = true;
          break;
        }
      }
      if (!hasTargetNeighbor) continue;

      // Verify removing this cell doesn't disconnect the source region
      if (!isRemovable(idx, currentRegion)) continue;

      // Reassign!
      regions[idx] = targetRegion;
    }
  }

  return regions;
}

// Full 8-way adjacency uniqueness checker
function hasUniqueSolution(regions: number[], size: number): boolean {
  let solutions = 0;
  const colUsed = new Array(size).fill(false);
  const regionUsed = new Array(size).fill(false);
  const board = new Array(size).fill(-1);

  function solve(row: number) {
    if (solutions > 1) return;
    if (row === size) {
      solutions++;
      return;
    }

    for (let col = 0; col < size; col++) {
      if (colUsed[col]) continue;

      const regionId = regions[row * size + col];
      if (regionUsed[regionId]) continue;

      // Check 8-way adjacency — only need to check row-1
      // (earlier rows have distance > 1, so adjacency is impossible)
      if (row > 0) {
        const prevCol = board[row - 1];
        if (Math.abs(prevCol - col) <= 1) continue;
      }

      board[row] = col;
      colUsed[col] = true;
      regionUsed[regionId] = true;

      solve(row + 1);

      board[row] = -1;
      colUsed[col] = false;
      regionUsed[regionId] = false;
    }
  }

  solve(0);
  return solutions === 1;
}

// Roughly one candidate in 8,000 survives the uniqueness check, so this budget
// only expects to see a handful of valid layouts — barely enough to be choosy
// about difficulty. It is set well above what a typical run consumes because
// almost every run succeeds early; the size only shows up in the tail, and the
// preloader absorbs that.
const MAX_SEEDS = 2500;
const REGIONS_PER_SEED = 15;

/**
 * Searches for a layout worth shipping, counting every rejection by cause.
 *
 * `minLookaheads` is a target, not a gate. Roughly one candidate in 8,000
 * survives the uniqueness check, so a 15,000-candidate budget only ever gets
 * to look at one or two — far too few to hold out for a rating. An earlier
 * version treated the floor as a hard filter with an unfiltered second phase
 * behind it, which meant that whenever the floor bit, the fallback shipped
 * whatever it found next: the strictest setting produced the most trivial
 * puzzles.
 *
 * So the phase keeps the best layout it has seen and returns that when the
 * budget runs out. The result is never worse than everything examined, and a
 * strict floor can no longer make the output worse than a loose one.
 */
interface PhaseResult {
  solution: number[] | null;
  regions: number[] | null;
  /** Rating of the returned layout, -1 when nothing was found. */
  rating: number;
  /** True when the layout cleared the target rather than being a fallback. */
  met: boolean;
  stats: PhaseStats;
}

function runPhase(
  phase: GenerationPhase,
  size: number,
  minLookaheads: number | null,
): PhaseResult {
  const startedAt = Date.now();
  const stats: PhaseStats = {
    phase,
    seedsTried: 0,
    seedFailures: 0,
    candidates: 0,
    rejectedRegionTooSmall: 0,
    rejectedNonUnique: 0,
    rejectedTrivial: 0,
    elapsedMs: 0,
  };

  const finish = (
    solution: number[] | null,
    regions: number[] | null,
    rating: number,
    met: boolean,
  ): PhaseResult => {
    stats.elapsedMs = Date.now() - startedAt;
    return { solution, regions, rating, met, stats };
  };

  // Best layout seen so far, kept so exhausting the budget still ships the
  // pick of everything examined rather than nothing.
  let bestSeed: number[] | null = null;
  let bestRegions: number[] | null = null;
  let bestRating = -1;

  for (let s = 0; s < MAX_SEEDS; s++) {
    stats.seedsTried++;
    const seed = generateSeed(size);
    if (!seed) {
      stats.seedFailures++;
      continue;
    }

    for (let r = 0; r < REGIONS_PER_SEED; r++) {
      stats.candidates++;
      const regions = generateRegions(seed, size);

      // Verify no region has fewer than 2 cells
      const regionSizes = new Array(size).fill(0);
      for (let i = 0; i < size * size; i++) regionSizes[regions[i]]++;
      if (regionSizes.some((sz: number) => sz < 2)) {
        stats.rejectedRegionTooSmall++;
        continue;
      }

      if (!hasUniqueSolution(regions, size)) {
        stats.rejectedNonUnique++;
        continue;
      }

      // No target: the first unique layout wins, which is what the
      // measurement harness samples.
      if (minLookaheads === null) return finish(seed, regions, -1, true);

      const rating = rateDifficulty(regions, size).steps.lookahead;
      if (rating >= minLookaheads) return finish(seed, regions, rating, true);

      stats.rejectedTrivial++;
      if (rating > bestRating) {
        bestRating = rating;
        bestSeed = seed;
        bestRegions = regions;
      }
    }
  }

  return finish(bestSeed, bestRegions, bestRating, false);
}

/**
 * Produces a puzzle, rated.
 *
 * `minLookaheads` is exposed so the measurement harness can pass null and
 * sample the untouched distribution — the same distribution the default floor
 * was chosen against.
 *
 * Both phases hold the same target and the best layout is carried *across*
 * them. Settling for a fallback inside the first phase would mean the second
 * never ran, which is how an earlier version still shipped the occasional
 * puzzle that solves itself: it stopped looking after one weak candidate.
 */
export function generatePuzzle(
  size: number,
  minLookaheads: number | null = MIN_INTERESTING_LOOKAHEADS,
): GenerationResult {
  const startedAt = Date.now();
  const phases: PhaseStats[] = [];

  const phaseOrder: GenerationPhase[] = ["strict", "relaxed"];

  let bestSolution: number[] | null = null;
  let bestRegions: number[] | null = null;
  let bestRating = -1;

  for (const phase of phaseOrder) {
    const result = runPhase(phase, size, minLookaheads);
    phases.push(result.stats);

    // `met` wins outright: the unfiltered path reports a rating of -1, which
    // would otherwise never beat the initial best.
    if (
      result.solution &&
      result.regions &&
      (result.met || result.rating > bestRating)
    ) {
      bestSolution = result.solution;
      bestRegions = result.regions;
      bestRating = result.rating;
    }

    // Only a layout that actually cleared the target ends the search early.
    if (result.met && result.solution && result.regions) break;
  }

  if (bestSolution && bestRegions) {
    const report = rateDifficulty(bestRegions, size);
    const difficulty: PuzzleDifficulty = {
      lookaheads: report.steps.lookahead,
      band: bandFor(report.steps.lookahead),
      technique: report.tier,
    };

    const success: GenerationSuccess = {
      success: true,
      regions: bestRegions,
      size,
      solution: bestSolution,
      difficulty,
      diagnostics: { size, elapsedMs: Date.now() - startedAt, phases },
    };
    return success;
  }

  const failure: GenerationFailure = {
    success: false,
    error: "Failed to generate puzzle",
    diagnostics: { size, elapsedMs: Date.now() - startedAt, phases },
  };
  return failure;
}
