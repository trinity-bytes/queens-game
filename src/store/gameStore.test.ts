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
    history: [],
    firstRunOpen: false,
    timer: 0,
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

describe("undo", () => {
  const undo = () => useGameStore.getState().undo();

  it("reverts the last cell change and counts as a move", () => {
    tap(OTHER_CELL);
    undo();

    const { cells, movesCount, timer } = useGameStore.getState();
    expect(cells[OTHER_CELL]).toBe(0);
    expect(movesCount).toBe(2);
    expect(timer).toBe(0);
  });

  it("takes a wrong queen back for free before it is settled", () => {
    tap(WRONG_CELL, 2);
    undo();
    tap(OTHER_CELL);

    const { cells, mistakes, solveLog } = useGameStore.getState();
    expect(cells[WRONG_CELL]).toBe(1);
    expect(mistakes).toBe(0);
    expect(solveLog.placements).toEqual([]);
  });

  it("never removes an error already committed", () => {
    tap(WRONG_CELL, 2);
    tap(OTHER_CELL);
    undo();
    undo();

    const { cells, mistakes } = useGameStore.getState();
    expect(cells[WRONG_CELL]).toBe(1);
    expect(mistakes).toBe(1);
  });

  it("brings back a queen that passed through, still unsettled", () => {
    tap(WRONG_CELL, 3);
    undo();

    expect(useGameStore.getState().cells[WRONG_CELL]).toBe(2);
    expect(useGameStore.getState().solveLog.placements).toHaveLength(1);

    tap(OTHER_CELL);
    expect(useGameStore.getState().mistakes).toBe(1);
  });

  it("does not charge twice for a settled queen brought back", () => {
    tap(WRONG_CELL, 2);
    tap(OTHER_CELL);
    tap(WRONG_CELL);
    undo();
    tap(OTHER_CELL);

    expect(useGameStore.getState().cells[WRONG_CELL]).toBe(2);
    expect(useGameStore.getState().mistakes).toBe(1);
  });

  it("does nothing with no history", () => {
    undo();

    expect(useGameStore.getState().movesCount).toBe(0);
  });

  it("keeps placements within the move count the API checks", () => {
    tap(WRONG_CELL, 3);
    undo();
    undo();
    undo();

    const { movesCount, solveLog } = useGameStore.getState();
    expect(solveLog.placements.length).toBeLessThanOrEqual(movesCount);
    expect(movesCount).toBe(6);
  });
});

describe("clearBoard", () => {
  const clear = () => useGameStore.getState().clearBoard();

  it("empties the board and keeps the timer and the count of moves", () => {
    useGameStore.setState({ timer: 5000 });
    tap(WRONG_CELL);
    tap(OTHER_CELL, 2);
    clear();

    const { cells, timer, movesCount } = useGameStore.getState();
    expect(cells.every((cell) => cell === 0)).toBe(true);
    expect(timer).toBe(5000);
    expect(movesCount).toBe(4);
  });

  it("charges a wrong queen standing when the board is cleared", () => {
    tap(WRONG_CELL, 2);
    clear();

    expect(useGameStore.getState().mistakes).toBe(1);
  });

  it("can be undone without charging again", () => {
    tap(WRONG_CELL, 2);
    clear();
    useGameStore.getState().undo();
    tap(OTHER_CELL);

    const { cells, mistakes } = useGameStore.getState();
    expect(cells[WRONG_CELL]).toBe(2);
    expect(mistakes).toBe(1);
  });

  it("does nothing on an empty board", () => {
    clear();

    expect(useGameStore.getState().movesCount).toBe(0);
  });
});

describe("first run", () => {
  it("holds the clock until the walkthrough closes", () => {
    useGameStore.setState({ firstRunOpen: true });
    useGameStore.getState().tickTimer();
    expect(useGameStore.getState().timer).toBe(0);

    useGameStore.getState().closeFirstRun();
    useGameStore.getState().tickTimer();
    expect(useGameStore.getState().timer).toBe(1000);
  });

  it("remembers that it was seen", () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", { setItem });

    useGameStore.getState().closeFirstRun();

    expect(setItem).toHaveBeenCalledWith("first-run-done", "1");
  });
});
