import type { PendingQueen } from "@/domain/mistakes";
import type { CellState, Move, SolveLog } from "@/store/gameStore";
import type { PuzzleDifficulty } from "@/workers/puzzleGenerator.types";

/**
 * Keeps a game alive across reloads. The clock has its own key: it changes every
 * second, and rewriting the whole board and its undo history that often would
 * be wasted work.
 *
 * Storage can be full or blocked, and what it returns can be from an older
 * version. Neither is worth interrupting a game for, so failures only mean the
 * game is not saved, and anything unreadable counts as no saved game.
 */

const GAME_KEY = "game-in-progress";
const TIMER_KEY = "game-in-progress-timer";

export interface SavedGame {
  gridSize: number;
  regions: number[];
  solution: number[];
  difficulty: PuzzleDifficulty | null;
  cells: CellState[];
  mistakes: number;
  pendingQueen: PendingQueen | null;
  history: Move[];
  movesCount: number;
  scoredQueens: number[];
  lastCorrectMoveTime: number;
  lastMoveTime: number;
  solveLog: SolveLog;
}

const attempt = (write: () => void) => {
  try {
    write();
  } catch (error) {
    console.error("Could not save the game:", error);
  }
};

export const saveGame = (game: SavedGame) =>
  attempt(() => localStorage.setItem(GAME_KEY, JSON.stringify(game)));

export const saveTimer = (timer: number) =>
  attempt(() => localStorage.setItem(TIMER_KEY, String(timer)));

export const clearSavedGame = () =>
  attempt(() => {
    localStorage.removeItem(GAME_KEY);
    localStorage.removeItem(TIMER_KEY);
  });

const isPlayable = (game: Partial<SavedGame> | null): game is SavedGame => {
  if (!game || typeof game.gridSize !== "number") return false;

  const squares = game.gridSize * game.gridSize;
  return (
    game.cells?.length === squares &&
    game.regions?.length === squares &&
    game.solution?.length === game.gridSize &&
    Array.isArray(game.history) &&
    typeof game.movesCount === "number" &&
    typeof game.mistakes === "number" &&
    Array.isArray(game.solveLog?.placements)
  );
};

export function loadGame(): (SavedGame & { timer: number }) | null {
  try {
    const game = JSON.parse(localStorage.getItem(GAME_KEY) ?? "null");
    if (!isPlayable(game)) return null;

    const timer = Number(localStorage.getItem(TIMER_KEY));
    return { ...game, timer: Number.isFinite(timer) ? timer : 0 };
  } catch {
    return null;
  }
}
