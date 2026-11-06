/**
 * What can be read off the board as the player sees it.
 *
 * Everything here works from the visible cells and regions, never from the
 * stored solution. Judging a queen against the solution would turn the board
 * into an oracle and let the puzzle be brute-forced.
 */

const QUEEN = 2;

export type ConflictRule = "touch" | "row" | "column" | "region";

/** The rule named when several clash at once, most visible first. */
const RULE_ORDER: ConflictRule[] = ["touch", "row", "column", "region"];

export interface Conflicts {
  queens: Set<number>;
  rule: ConflictRule | null;
}

/** Queens that touch are named as such even when they also share a line. */
function ruleBroken(
  first: number,
  second: number,
  regions: number[],
  gridSize: number,
): ConflictRule | null {
  const firstRow = Math.floor(first / gridSize);
  const firstCol = first % gridSize;
  const secondRow = Math.floor(second / gridSize);
  const secondCol = second % gridSize;

  if (
    Math.abs(firstRow - secondRow) <= 1 &&
    Math.abs(firstCol - secondCol) <= 1
  ) {
    return "touch";
  }
  if (firstRow === secondRow) return "row";
  if (firstCol === secondCol) return "column";
  if (regions[first] === regions[second]) return "region";
  return null;
}

export function findConflicts(
  cells: number[],
  regions: number[],
  gridSize: number,
): Conflicts {
  const placed: number[] = [];
  cells.forEach((cell, index) => {
    if (cell === QUEEN) placed.push(index);
  });

  const queens = new Set<number>();
  const broken = new Set<ConflictRule>();

  for (let a = 0; a < placed.length; a++) {
    for (let b = a + 1; b < placed.length; b++) {
      const rule = ruleBroken(placed[a], placed[b], regions, gridSize);
      if (!rule) continue;

      queens.add(placed[a]);
      queens.add(placed[b]);
      broken.add(rule);
    }
  }

  return {
    queens,
    rule: RULE_ORDER.find((rule) => broken.has(rule)) ?? null,
  };
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Unit-long edges between cells of different regions, in cell coordinates. */
export function regionBoundaries(
  regions: number[],
  gridSize: number,
): Segment[] {
  const segments: Segment[] = [];

  regions.forEach((region, index) => {
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;

    if (col < gridSize - 1 && regions[index + 1] !== region) {
      segments.push({ x1: col + 1, y1: row, x2: col + 1, y2: row + 1 });
    }
    if (row < gridSize - 1 && regions[index + gridSize] !== region) {
      segments.push({ x1: col, y1: row + 1, x2: col + 1, y2: row + 1 });
    }
  });

  return segments;
}
