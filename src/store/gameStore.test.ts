import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGameStore } from "./gameStore";

// A 4x4 board whose solution sits in columns 1, 3, 0, 2.
const SOLUTION = [1, 3, 0, 2];
const SIZE = SOLUTION.length;
const cellAt = (row: number, col: number) => row * SIZE + col;
const WRONG_CELL = cellAt(0, 0);
const OTHER_CELL = cellAt(3, 3);

const tap = (index: number, times = 1) => {
  for (let i = 0; i < times; i++) useGameStore.getState().toggleCell(index);
};

beforeEach(() => {
  vi.stubGlobal("localStorage", {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  });
  useGameStore.setState({
    gridSize: SIZE,
    solution: SOLUTION,
    regions: [0, 0, 1, 1, 0, 0, 1, 1, 2, 2, 3, 3, 2, 2, 3, 3],
    cells: new Array(SIZE * SIZE).fill(0),
    status: "playing",
    difficulty: { band: "gentle", lookaheads: 0 } as never,
    mistakes: 0,
    pendingQueen: null,
    movesCount: 0,
    solveLog: {
      placements: [],
      xMarksPlaced: 0,
      peakXMarks: 0,
      puzzlesAbandoned: 0,
    },
  });
});

describe("toggleCell mistakes", () => {
  it("charges nothing for clearing an X through the queen state", () => {
    tap(WRONG_CELL, 3);

    const { cells, mistakes, movesCount, solveLog } = useGameStore.getState();
    expect(cells[WRONG_CELL]).toBe(0);
    expect(mistakes).toBe(0);
    expect(movesCount).toBe(3);
    expect(solveLog.placements).toEqual([]);
    expect(solveLog.xMarksPlaced).toBe(1);
  });

  it("charges a wrong queen once the player acts on another cell", () => {
    tap(WRONG_CELL, 2);
    expect(useGameStore.getState().mistakes).toBe(0);

    tap(OTHER_CELL);

    const { mistakes, solveLog } = useGameStore.getState();
    expect(mistakes).toBe(1);
    expect(solveLog.placements).toEqual([{ atMs: 0, correct: false }]);
  });

  it("scores a won game with the errors that stood", () => {
    tap(WRONG_CELL, 2);
    tap(OTHER_CELL);
    tap(WRONG_CELL);
    tap(OTHER_CELL, 2);
    SOLUTION.forEach((col, row) => tap(cellAt(row, col), 2));

    const { status, mistakes, score, grossScore } = useGameStore.getState();
    expect(status).toBe("won");
    expect(mistakes).toBe(1);
    expect(score).toBe(Math.round(grossScore * 0.92));
  });
});
