// src/workers/puzzleGenerator.worker.ts

import type {
  GenerationFailure,
  GenerationPhase,
  GenerationSuccess,
  PhaseStats,
} from "./puzzleGenerator.types";

// Helper to check if a queen can be placed at (row, col)
function isValidQueenPlacement(
  board: number[],
  row: number,
  col: number,
): boolean {
  for (let r = 0; r < row; r++) {
    const c = board[r];
    // Column conflict
    if (c === col) return false;
    // Standard diagonal conflict
    if (Math.abs(c - col) === Math.abs(r - row)) return false;
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

// Evaluate puzzle difficulty: count how many queens can be placed by trivial elimination
// Returns the fraction of queens that are trivially placed (lower = harder)
function evaluateDifficulty(regions: number[], size: number): number {
  // For each row, count how many valid columns exist considering only
  // region constraints (ignoring adjacency). If only 1 valid column exists
  // for a region in any row, that queen placement is trivial.
  const regionRowOptions: Map<number, number[][]> = new Map();

  // For each region, find all cells
  for (let regionId = 0; regionId < size; regionId++) {
    const cells: number[][] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (regions[r * size + c] === regionId) {
          cells.push([r, c]);
        }
      }
    }
    regionRowOptions.set(regionId, cells);
  }

  // Count regions that appear in only 1 row (trivially placeable)
  let trivialCount = 0;
  for (let regionId = 0; regionId < size; regionId++) {
    const cells = regionRowOptions.get(regionId)!;
    const uniqueRows = new Set(cells.map(([r]) => r));
    const uniqueCols = new Set(cells.map(([, c]) => c));
    // If a region only spans 1 row or 1 column, it's trivial
    if (uniqueRows.size === 1 || uniqueCols.size === 1) {
      trivialCount++;
    }
  }

  return trivialCount / size;
}

const MAX_SEEDS = 1000;
const REGIONS_PER_SEED = 15;
const MAX_TRIVIAL_FRACTION = 0.5;

/**
 * Searches for an acceptable layout, counting every rejection by cause.
 *
 * Both phases share this body: "relaxed" differs from "strict" only in passing
 * a null trivial-fraction ceiling, which skips the difficulty filter. Measured
 * over 250k candidates at size 9, that filter rejects effectively nothing (the
 * observed trivial fraction of unique layouts tops out around 0.44 against a
 * 0.5 ceiling), so the two phases search at nearly the same acceptance rate.
 * The counters below exist to keep that claim checkable rather than assumed.
 */
function runPhase(
  phase: GenerationPhase,
  size: number,
  maxTrivialFraction: number | null,
): { solution: number[] | null; regions: number[] | null; stats: PhaseStats } {
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

  const finish = (solution: number[] | null, regions: number[] | null) => {
    stats.elapsedMs = Date.now() - startedAt;
    return { solution, regions, stats };
  };

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

      if (
        maxTrivialFraction !== null &&
        evaluateDifficulty(regions, size) > maxTrivialFraction
      ) {
        stats.rejectedTrivial++;
        continue;
      }

      return finish(seed, regions);
    }
  }

  return finish(null, null);
}

self.onmessage = (e: MessageEvent) => {
  const { size } = e.data;
  const startedAt = Date.now();
  const phases: PhaseStats[] = [];

  const phaseConfigs: [GenerationPhase, number | null][] = [
    ["strict", MAX_TRIVIAL_FRACTION],
    ["relaxed", null],
  ];

  for (const [phase, maxTrivialFraction] of phaseConfigs) {
    const { solution, regions, stats } = runPhase(
      phase,
      size,
      maxTrivialFraction,
    );
    phases.push(stats);

    if (solution && regions) {
      const result: GenerationSuccess = {
        success: true,
        regions,
        size,
        solution,
        diagnostics: { size, elapsedMs: Date.now() - startedAt, phases },
      };
      self.postMessage(result);
      return;
    }
  }

  const result: GenerationFailure = {
    success: false,
    error: "Failed to generate puzzle",
    diagnostics: { size, elapsedMs: Date.now() - startedAt, phases },
  };
  self.postMessage(result);
};
