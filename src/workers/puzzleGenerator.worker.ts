// src/workers/puzzleGenerator.worker.ts

// Helper to check if a queen can be placed at (row, col)
function isValidQueenPlacement(
  board: number[],
  size: number,
  row: number,
  col: number,
): boolean {
  for (let r = 0; r < row; r++) {
    const c = board[r];
    if (c === col || Math.abs(c - col) === Math.abs(r - row)) {
      return false;
    }
    // Check 8-way adjacency (which includes diagonal, but we also need to check orthogonal if not covered by row/col)
    // Actually, row/col covers orthogonal. Math.abs(c-col) === Math.abs(r-row) covers perfect diagonals.
    // We need to ensure NO touching at all (even knight moves if we wanted, but standard is just 8-way).
    // 8-way touching means distance in row <= 1 AND distance in col <= 1.
    if (Math.abs(r - row) <= 1 && Math.abs(c - col) <= 1) {
      return false;
    }
  }
  return true;
}

// Generate a valid seed of N queens
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
      if (isValidQueenPlacement(board, size, row, col)) {
        board[row] = col;
        if (solve(row + 1)) return true;
        board[row] = -1;
      }
    }
    return false;
  }

  return solve(0) ? board : null;
}

// Generate regions based on the seed
function generateRegions(seed: number[], size: number): number[] {
  const regions = new Array(size * size).fill(-1);
  const queue: { r: number; c: number; id: number }[] = [];

  // Initialize regions with queens
  for (let i = 0; i < size; i++) {
    const r = i;
    const c = seed[i];
    regions[r * size + c] = i;
    queue.push({ r, c, id: i });
  }

  // Shuffle queue
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }

  // Flood fill
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  while (queue.length > 0) {
    // Pick a random element from the queue to grow organically
    const idx = Math.floor(Math.random() * queue.length);
    const { r, c, id } = queue.splice(idx, 1)[0];

    // Shuffle directions
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }

    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        if (regions[nr * size + nc] === -1) {
          regions[nr * size + nc] = id;
          queue.push({ r: nr, c: nc, id });
        }
      }
    }
  }

  return regions;
}

// Check if the puzzle has a unique solution
function hasUniqueSolution(regions: number[], size: number): boolean {
  let solutions = 0;
  const colUsed = new Array(size).fill(false);
  const regionUsed = new Array(size).fill(false);
  const board = new Array(size).fill(-1);

  function solve(row: number) {
    if (solutions > 1) return; // Early exit
    if (row === size) {
      solutions++;
      return;
    }

    for (let col = 0; col < size; col++) {
      if (colUsed[col]) continue;

      const regionId = regions[row * size + col];
      if (regionUsed[regionId]) continue;

      // Check 8-way adjacency with previous rows
      let valid = true;
      if (row > 0) {
        const prevCol = board[row - 1];
        if (Math.abs(prevCol - col) <= 1) valid = false;
      }

      if (valid) {
        board[row] = col;
        colUsed[col] = true;
        regionUsed[regionId] = true;

        solve(row + 1);

        colUsed[col] = false;
        regionUsed[regionId] = false;
      }
    }
  }

  solve(0);
  return solutions === 1;
}

self.onmessage = (e: MessageEvent) => {
  const { size } = e.data;

  let attempts = 0;
  while (attempts < 1000) {
    attempts++;
    const seed = generateSeed(size);
    if (!seed) continue;

    const regions = generateRegions(seed, size);

    if (hasUniqueSolution(regions, size)) {
      self.postMessage({ success: true, regions, size, solution: seed });
      return;
    }
  }

  self.postMessage({ success: false, error: "Failed to generate puzzle" });
};
