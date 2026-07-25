import { create } from "zustand";
import { getCurrentTheme } from "@/lib/themeSelector";
import { Locale, getInitialLocale, setStoredLocale } from "@/lib/i18n";
import { setSoundEnabled } from "@/lib/sound";

export type CellState = 0 | 1 | 2; // 0: empty, 1: X, 2: Queen

/**
 * Scoring is computed silently while playing and only revealed once the puzzle
 * is solved. Any live score/combo/penalty signal would act as an oracle: the
 * player could read the sign of a score change to learn whether a queen sits on
 * the stored solution, and brute-force the board cell by cell.
 */
export type GameStatus = "idle" | "generating" | "playing" | "won";
export type Theme = "dino" | "dog" | "cow" | "potato" | "starwars" | "elephant";

interface PreloadedPuzzle {
  regions: number[];
  solution: number[];
  size: number;
}

interface GameState {
  gridSize: number;
  regions: number[];
  solution: number[];
  cells: CellState[];
  theme: Theme;
  timer: number;
  mistakes: number;
  xPenalties: number;
  score: number;
  grossScore: number;
  totalPenalties: number;
  scoredQueens: number[];
  combo: number;
  lastCorrectMoveTime: number;
  lastMoveTime: number;
  movesCount: number;
  status: GameStatus;
  currentWinId: string | null;
  savedWinId: string | null;
  darkMode: boolean;
  locale: Locale;
  soundEnabled: boolean;
  preloadedPuzzle: PreloadedPuzzle | null;
  isPreloading: boolean;

  // Actions
  setGridSize: (size: number) => void;
  setTheme: (theme: Theme) => void;
  setLocale: (locale: Locale) => void;
  toggleDarkMode: () => void;
  toggleSound: () => void;
  generatePuzzle: () => void;
  preloadNextPuzzle: () => void;
  toggleCell: (index: number) => void;
  incrementXPenalty: () => void;
  resetBoard: () => void;
  tickTimer: () => void;
  checkWinCondition: () => void;
  hasSavedCurrentWin: () => boolean;
  markCurrentWinSaved: () => void;
}

const THEMES: Theme[] = [
  "dino",
  "dog",
  "cow",
  "potato",
  "starwars",
  "elephant",
];

const SOUND_STORAGE_KEY = "sound-enabled";

// Sound is opt-in: a page that makes noise on first load is never forgiven.
const getInitialSound = (): boolean => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SOUND_STORAGE_KEY) === "true";
};

// Helper to detect system dark mode preference
const getInitialDarkMode = (): boolean => {
  if (typeof window === "undefined") return false;

  // Check if user has manually set a preference
  const stored = localStorage.getItem("dark-mode-override");
  if (stored !== null) {
    return stored === "true";
  }

  // Otherwise, use system preference
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

const initialSound = getInitialSound();
setSoundEnabled(initialSound);

export const useGameStore = create<GameState>((set, get) => ({
  gridSize: 9,
  regions: [],
  solution: [],
  cells: [],
  theme: getCurrentTheme(),
  timer: 0,
  mistakes: 0,
  xPenalties: 0,
  score: 0,
  grossScore: 0,
  totalPenalties: 0,
  scoredQueens: [],
  combo: 1,
  lastCorrectMoveTime: 0,
  lastMoveTime: 0,
  movesCount: 0,
  status: "idle",
  currentWinId: null,
  savedWinId: null,
  darkMode: getInitialDarkMode(),
  locale: getInitialLocale(),
  soundEnabled: initialSound,
  preloadedPuzzle: null,
  isPreloading: false,

  setGridSize: (size) => {
    set({ gridSize: size, preloadedPuzzle: null }); // Invalidate preloaded puzzle if size changes
  },
  setTheme: (theme) => set({ theme }),
  setLocale: (locale) => {
    set({ locale });
    setStoredLocale(locale);
  },

  toggleDarkMode: () => {
    const newMode = !get().darkMode;
    set({ darkMode: newMode });
    localStorage.setItem("dark-mode-override", String(newMode));
  },

  toggleSound: () => {
    const newValue = !get().soundEnabled;
    set({ soundEnabled: newValue });
    setSoundEnabled(newValue);
    localStorage.setItem(SOUND_STORAGE_KEY, String(newValue));
  },

  generatePuzzle: () => {
    const { preloadedPuzzle, gridSize } = get();

    // Reset game stats
    set({
      timer: 0,
      mistakes: 0,
      xPenalties: 0,
      score: 0,
      grossScore: 0,
      totalPenalties: 0,
      scoredQueens: [],
      combo: 1,
      lastCorrectMoveTime: 0,
      lastMoveTime: 0,
      movesCount: 0,
      cells: [],
      currentWinId: null,
      savedWinId: null,
    });

    // If we have a preloaded puzzle for the current size, use it immediately
    if (preloadedPuzzle && preloadedPuzzle.size === gridSize) {
      set({
        regions: preloadedPuzzle.regions,
        solution: preloadedPuzzle.solution,
        cells: new Array(gridSize * gridSize).fill(0),
        status: "playing",
        theme: getCurrentTheme(),
        preloadedPuzzle: null, // Consume it
      });
      // Start preloading the next one
      get().preloadNextPuzzle();
      return;
    }

    // Otherwise, generate one now (shows loading screen)
    set({ status: "generating" });

    const worker = new Worker(
      new URL("../workers/puzzleGenerator.worker.ts", import.meta.url),
    );

    worker.onmessage = (e) => {
      if (e.data.success) {
        set({
          regions: e.data.regions,
          solution: e.data.solution,
          cells: new Array(e.data.size * e.data.size).fill(0),
          status: "playing",
          theme: getCurrentTheme(),
        });
        // Start preloading the next one
        get().preloadNextPuzzle();
      } else {
        console.error(e.data.error);
        set({ status: "idle" });
      }
      worker.terminate();
    };

    worker.postMessage({ size: gridSize });
  },

  preloadNextPuzzle: () => {
    const { isPreloading, gridSize } = get();
    if (isPreloading) return;

    set({ isPreloading: true });

    const worker = new Worker(
      new URL("../workers/puzzleGenerator.worker.ts", import.meta.url),
    );

    worker.onmessage = (e) => {
      if (e.data.success) {
        set({
          preloadedPuzzle: {
            regions: e.data.regions,
            solution: e.data.solution,
            size: e.data.size,
          },
          isPreloading: false,
        });
      } else {
        console.error("Failed to preload puzzle:", e.data.error);
        set({ isPreloading: false });
      }
      worker.terminate();
    };

    worker.postMessage({ size: gridSize });
  },

  toggleCell: (index) => {
    const {
      cells,
      status,
      solution,
      gridSize,
      mistakes,
      score,
      grossScore,
      totalPenalties,
      scoredQueens,
      combo,
      lastCorrectMoveTime,
      lastMoveTime,
      movesCount,
      timer,
    } = get();
    if (status !== "playing") return;

    const newCells = [...cells];
    const currentState = newCells[index];
    // Cycle states: 0 -> 1 -> 2 -> 0
    const newState = currentState === 0 ? 1 : currentState === 1 ? 2 : 0;
    newCells[index] = newState as CellState;

    let newMistakes = mistakes;
    let newScore = score;
    let newGrossScore = grossScore;
    let newTotalPenalties = totalPenalties;
    let newScoredQueens = [...scoredQueens];
    let newCombo = combo;
    let newLastCorrectMoveTime = lastCorrectMoveTime;
    let newLastMoveTime = timer;
    let newMovesCount = movesCount + 1;

    if (newState === 2) {
      const row = Math.floor(index / gridSize);
      const col = index % gridSize;
      if (solution[row] !== col) {
        newMistakes++;
        const penalty = 200;
        newScore = Math.max(0, newScore - penalty);
        newTotalPenalties += penalty;
        newCombo = 1;
      } else {
        // Correct placement
        if (!newScoredQueens.includes(index)) {
          const timeSinceLastCorrect = timer - lastCorrectMoveTime;

          if (timeSinceLastCorrect <= 5000 && lastCorrectMoveTime !== 0) {
            newCombo = Math.min(5, newCombo + 1);
          } else {
            newCombo = 1;
          }

          const secondsTaken = timeSinceLastCorrect / 1000;
          const speedBonus = Math.max(0, 1000 - secondsTaken * 200);
          const pointsEarned = Math.floor((500 + speedBonus) * newCombo);

          newScore += pointsEarned;
          newGrossScore += pointsEarned;
          newScoredQueens.push(index);
          newLastCorrectMoveTime = timer;
        }
      }
    }

    set({
      cells: newCells,
      mistakes: newMistakes,
      score: newScore,
      grossScore: newGrossScore,
      totalPenalties: newTotalPenalties,
      scoredQueens: newScoredQueens,
      combo: newCombo,
      lastCorrectMoveTime: newLastCorrectMoveTime,
      lastMoveTime: newLastMoveTime,
      movesCount: newMovesCount,
    });
    get().checkWinCondition();
  },

  incrementXPenalty: () => {
    set((state) => {
      const penalty = 50;
      return {
        xPenalties: state.xPenalties + 1,
        score: Math.max(0, state.score - penalty),
        totalPenalties: state.totalPenalties + penalty,
        lastMoveTime: state.timer,
        movesCount: state.movesCount + 1,
      };
    });
  },

  resetBoard: () => {
    const { cells } = get();
    set({
      cells: new Array(cells.length).fill(0),
      timer: 0,
      mistakes: 0,
      xPenalties: 0,
      score: 0,
      grossScore: 0,
      totalPenalties: 0,
      scoredQueens: [],
      combo: 1,
      lastCorrectMoveTime: 0,
      lastMoveTime: 0,
      movesCount: 0,
      status: "playing",
      currentWinId: null,
      savedWinId: null,
    });
  },

  tickTimer: () => {
    const {
      status,
      timer,
      lastCorrectMoveTime,
      lastMoveTime,
      combo,
      score,
      totalPenalties,
    } = get();
    if (status === "playing") {
      const newTimer = timer + 1000;
      let newCombo = combo;

      // Lose combo if 10 seconds pass without a correct move
      if (newTimer - lastCorrectMoveTime > 10000 && lastCorrectMoveTime !== 0) {
        newCombo = 1;
      }

      const timeSinceLastMove = newTimer - lastMoveTime;
      const penalty = 5 + Math.floor(timeSinceLastMove / 1000) * 5;

      set({
        timer: newTimer,
        combo: newCombo,
        score: Math.max(0, score - penalty),
        totalPenalties: totalPenalties + penalty,
      });
    }
  },

  checkWinCondition: () => {
    const { cells, gridSize, regions, timer, score, grossScore } = get();

    // Count queens
    const queens = cells.reduce((acc, cell, idx) => {
      if (cell === 2) acc.push(idx);
      return acc;
    }, [] as number[]);

    if (queens.length !== gridSize) return;

    // Check rows, cols, regions, and adjacency
    const rowUsed = new Set<number>();
    const colUsed = new Set<number>();
    const regionUsed = new Set<number>();

    for (const q of queens) {
      const r = Math.floor(q / gridSize);
      const c = q % gridSize;
      const reg = regions[q];

      if (rowUsed.has(r) || colUsed.has(c) || regionUsed.has(reg)) return;

      rowUsed.add(r);
      colUsed.add(c);
      regionUsed.add(reg);

      // Check 8-way adjacency
      for (const otherQ of queens) {
        if (q === otherQ) continue;
        const or = Math.floor(otherQ / gridSize);
        const oc = otherQ % gridSize;

        if (Math.abs(r - or) <= 1 && Math.abs(c - oc) <= 1) return;
      }
    }

    // Calculate final speed bonus
    const maxTimeForBonus = gridSize * 15; // e.g., 135 seconds for 9x9
    const secondsTaken = timer / 1000;
    const bonusPercentage = Math.max(
      0,
      0.1 * (1 - secondsTaken / maxTimeForBonus),
    );
    const bonusPoints = Math.floor(score * bonusPercentage);

    // If we reach here, it's a win!
    set({
      status: "won",
      score: score + bonusPoints,
      grossScore: grossScore + bonusPoints,
      currentWinId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      savedWinId: null,
    });
  },

  hasSavedCurrentWin: () => {
    const { currentWinId, savedWinId } = get();
    return Boolean(currentWinId && savedWinId === currentWinId);
  },

  markCurrentWinSaved: () => {
    const { currentWinId } = get();
    if (!currentWinId) return;
    set({ savedWinId: currentWinId });
  },
}));
