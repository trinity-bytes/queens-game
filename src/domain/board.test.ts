import { describe, expect, it } from "vitest";
import { cellsBetween, findConflicts, regionBoundaries } from "./board";

// Regions of a 3x3 board: a left column, then two rows on the right.
const REGIONS = [0, 1, 1, 0, 2, 2, 0, 2, 2];
const SIZE = 3;

const boardWith = (size: number, ...queens: number[]) => {
  const cells = new Array(size * size).fill(0);
  queens.forEach((index) => (cells[index] = 2));
  return cells;
};

const SPREAD_REGIONS = Array.from({ length: 25 }, (_, index) => index);

describe("findConflicts", () => {
  it("finds nothing on a board with no clash", () => {
    const { queens, rule } = findConflicts(boardWith(5, 0, 7), SPREAD_REGIONS, 5);

    expect(queens.size).toBe(0);
    expect(rule).toBeNull();
  });

  it("ignores X marks", () => {
    const cells = boardWith(5, 0);
    cells[1] = 1;

    expect(findConflicts(cells, SPREAD_REGIONS, 5).rule).toBeNull();
  });

  it("names two queens that touch diagonally", () => {
    const { queens, rule } = findConflicts(boardWith(5, 0, 6), SPREAD_REGIONS, 5);

    expect(Array.from(queens).sort()).toEqual([0, 6]);
    expect(rule).toBe("touch");
  });

  it("names two queens in one row", () => {
    expect(findConflicts(boardWith(5, 0, 2), SPREAD_REGIONS, 5).rule).toBe("row");
  });

  it("names two queens in one column", () => {
    expect(findConflicts(boardWith(5, 0, 10), SPREAD_REGIONS, 5).rule).toBe(
      "column",
    );
  });

  it("names two queens in one region", () => {
    const regions = [...SPREAD_REGIONS];
    regions[7] = regions[0];

    expect(findConflicts(boardWith(5, 0, 7), regions, 5).rule).toBe("region");
  });

  it("calls neighbours in a row touching, because that is what is visible", () => {
    expect(findConflicts(boardWith(5, 0, 1), SPREAD_REGIONS, 5).rule).toBe(
      "touch",
    );
  });

  it("marks every queen in a clash, whichever rule is named", () => {
    const { queens, rule } = findConflicts(
      boardWith(5, 0, 1, 20, 24),
      SPREAD_REGIONS,
      5,
    );

    expect(Array.from(queens).sort((a, b) => a - b)).toEqual([0, 1, 20, 24]);
    expect(rule).toBe("touch");
  });
});

describe("regionBoundaries", () => {
  it("draws a line only where two regions meet", () => {
    expect(regionBoundaries(REGIONS, SIZE)).toEqual(
      expect.arrayContaining([
        { x1: 1, y1: 0, x2: 1, y2: 1 },
        { x1: 1, y1: 1, x2: 2, y2: 1 },
        { x1: 2, y1: 1, x2: 3, y2: 1 },
        { x1: 1, y1: 1, x2: 1, y2: 2 },
        { x1: 1, y1: 2, x2: 1, y2: 3 },
      ]),
    );
    expect(regionBoundaries(REGIONS, SIZE)).toHaveLength(5);
  });

  it("draws nothing on a board of one region", () => {
    expect(regionBoundaries(new Array(9).fill(0), SIZE)).toEqual([]);
  });

  it("draws nothing before a puzzle has loaded", () => {
    expect(regionBoundaries([], SIZE)).toEqual([]);
  });
});

describe("cellsBetween", () => {
  const SIZE = 5;
  const at = (row: number, col: number) => row * SIZE + col;

  it("is the cell alone when a stroke has not left it", () => {
    expect(cellsBetween(at(2, 2), at(2, 2), SIZE)).toEqual([at(2, 2)]);
  });

  it("fills the cells a fast stroke jumped over along a row", () => {
    expect(cellsBetween(at(1, 0), at(1, 3), SIZE)).toEqual([
      at(1, 0),
      at(1, 1),
      at(1, 2),
      at(1, 3),
    ]);
  });

  it("walks backwards up a column", () => {
    expect(cellsBetween(at(3, 4), at(1, 4), SIZE)).toEqual([
      at(3, 4),
      at(2, 4),
      at(1, 4),
    ]);
  });

  it("steps straight down a diagonal", () => {
    expect(cellsBetween(at(0, 0), at(2, 2), SIZE)).toEqual([
      at(0, 0),
      at(1, 1),
      at(2, 2),
    ]);
  });
});
