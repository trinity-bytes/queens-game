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

describe("startGame", () => {
  it("resumes a saved game instead of dealing a new one", () => {
    const stored = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
      removeItem: (key: string) => stored.delete(key),
    });
    vi.stubGlobal(
      "Worker",
      class {
        postMessage() {}
        terminate() {}
      },
    );

    tap(WRONG_CELL, 2);
    tap(OTHER_CELL);
    useGameStore.setState({ timer: 9000 });
    const before = useGameStore.getState();

    useGameStore.setState({
      status: "idle",
      cells: [],
      timer: 0,
      mistakes: 0,
      movesCount: 0,
    });
    useGameStore.getState().startGame();

    const after = useGameStore.getState();
    expect(after.status).toBe("playing");
    expect(after.cells).toEqual(before.cells);
    expect(after.timer).toBe(9000);
    expect(after.mistakes).toBe(1);
    expect(after.movesCount).toBe(3);
    expect(stored.get("puzzles-abandoned")).toBeUndefined();
  });

  it("forgets the saved game once it is won", () => {
    const removeItem = vi.fn();
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => undefined,
      removeItem,
    });

    SOLUTION.forEach((col, row) => tap(cellAt(row, col), 2));

    expect(removeItem).toHaveBeenCalledWith("game-in-progress");
  });
});

describe("markCells", () => {
  const STROKE = 1;
  const mark = (indices: number[], stroke = STROKE) =>
    useGameStore.getState().markCells(indices, stroke);

  it("marks every empty cell of a stroke with an X", () => {
    expect(mark([0, 1, 2])).toBe(true);

    const { cells, solveLog } = useGameStore.getState();
    expect(cells.slice(0, 4)).toEqual([1, 1, 1, 0]);
    expect(solveLog.xMarksPlaced).toBe(3);
    expect(solveLog.peakXMarks).toBe(3);
  });

  it("leaves queens and existing marks as they are", () => {
    tap(0, 2);
    tap(1);
    mark([0, 1, 2]);

    const { cells, solveLog } = useGameStore.getState();
    expect(cells.slice(0, 3)).toEqual([2, 1, 1]);
    expect(solveLog.xMarksPlaced).toBe(3);
  });

  it("counts a whole stroke as one move", () => {
    mark([0]);
    mark([1, 2]);
    mark([3]);

    const { movesCount, history } = useGameStore.getState();
    expect(movesCount).toBe(1);
    expect(history).toHaveLength(1);
  });

  it("takes back a whole stroke with one undo", () => {
    mark([0]);
    mark([1, 2]);
    useGameStore.getState().undo();

    const { cells, history } = useGameStore.getState();
    expect(cells.every((cell) => cell === 0)).toBe(true);
    expect(history).toHaveLength(0);
  });

  it("keeps separate strokes as separate moves", () => {
    mark([0], 1);
    mark([1], 2);
    useGameStore.getState().undo();

    const { cells, movesCount } = useGameStore.getState();
    expect(cells.slice(0, 2)).toEqual([1, 0]);
    expect(movesCount).toBe(3);
  });

  it("is no move at all when the stroke finds nothing to mark", () => {
    tap(WRONG_CELL, 2);

    expect(mark([WRONG_CELL])).toBe(false);

    const { movesCount, history, mistakes, pendingQueen } =
      useGameStore.getState();
    expect(movesCount).toBe(2);
    expect(history).toHaveLength(2);
    expect(mistakes).toBe(0);
    expect(pendingQueen).toEqual({ index: WRONG_CELL, correct: false });
  });

  it("settles a wrong queen the moment a stroke marks another cell", () => {
    tap(WRONG_CELL, 2);
    mark([OTHER_CELL]);

    const { mistakes, pendingQueen } = useGameStore.getState();
    expect(mistakes).toBe(1);
    expect(pendingQueen).toBeNull();
  });

  it("does nothing once the game is not being played", () => {
    useGameStore.setState({ status: "won" });

    expect(mark([0])).toBe(false);
    expect(useGameStore.getState().cells[0]).toBe(0);
  });
});
