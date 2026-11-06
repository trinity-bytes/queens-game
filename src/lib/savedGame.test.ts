import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearSavedGame, loadGame, saveGame, saveTimer } from "./savedGame";

const GAME = {
  gridSize: 4,
  regions: new Array(16).fill(0),
  solution: [1, 3, 0, 2],
  difficulty: { band: "gentle", lookaheads: 2 } as never,
  cells: new Array(16).fill(0),
  mistakes: 1,
  pendingQueen: { index: 3, correct: false },
  history: [],
  movesCount: 4,
  solveLog: {
    placements: [],
    xMarksPlaced: 1,
    peakXMarks: 1,
    puzzlesAbandoned: 2,
  },
};

let stored: Map<string, string>;

beforeEach(() => {
  stored = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
    removeItem: (key: string) => stored.delete(key),
  });
});

describe("saved game", () => {
  it("brings back everything that was saved, with the clock", () => {
    saveGame(GAME);
    saveTimer(7000);

    expect(loadGame()).toEqual({ ...GAME, timer: 7000 });
  });

  it("has nothing to load before a game is saved", () => {
    expect(loadGame()).toBeNull();
  });

  it("has nothing to load once cleared", () => {
    saveGame(GAME);
    saveTimer(7000);
    clearSavedGame();

    expect(loadGame()).toBeNull();
  });

  it("ignores stored data it cannot read", () => {
    stored.set("game-in-progress", "{not json");

    expect(loadGame()).toBeNull();
  });

  it("ignores a game whose board does not match its size", () => {
    saveGame({ ...GAME, cells: [0, 1] });

    expect(loadGame()).toBeNull();
  });

  it("starts the clock at zero if only the board survived", () => {
    saveGame(GAME);

    expect(loadGame()?.timer).toBe(0);
  });

  it("does not throw when storage is full", () => {
    vi.stubGlobal("localStorage", {
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    });

    expect(() => saveGame(GAME)).not.toThrow();
    expect(() => saveTimer(1000)).not.toThrow();
  });
});
