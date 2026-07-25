import { create } from "zustand";
import { getCurrentTheme } from "@/lib/themeSelector";
import { Locale, getInitialLocale, setStoredLocale } from "@/lib/i18n";
import { setSoundEnabled } from "@/lib/sound";
import {
  summarizeDiagnostics,
  type GenerationDiagnostics,
  type GenerationResult,
} from "@/workers/puzzleGenerator.types";

export type CellState = 0 | 1 | 2; // 0: empty, 1: X, 2: Queen

/**
 * Scoring is computed silently while playing and only revealed once the puzzle
 * is solved. Any live score/combo/penalty signal would act as an oracle: the
 * player could read the sign of a score change to learn whether a queen sits on
 * the stored solution, and brute-force the board cell by cell.
 */
/**
 * "error" is terminal on purpose. Generation failure used to fall back to
 * "idle", but Board re-runs generatePuzzle whenever it sees "idle", so a
 * failure re-triggered generation immediately and spun forever — each cycle
 * burning two full phases of backtracking in a worker thread. Only an explicit
 * player action leaves "error".
 */
export type GameStatus = "idle" | "generating" | "playing" | "won" | "error";
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
  markCurrentWinSaved: () => void;
}

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

/**
 * The generator is probabilistic and does fail: measured over 250 runs at size
 * 9 (~2M candidates) it accepts roughly 1 layout per 8,000, against a budget of
 * 15,000 candidates per phase, which leaves a single worker failing about 1.2%
 * of the time. Rare, but every puzzle spawns two workers, so it is worth
 * retrying — and the retries have to be bounded, or a genuinely impossible
 * configuration pins a core indefinitely.
 */
const MAX_GENERATION_ATTEMPTS = 3;
const GENERATION_RETRY_BASE_MS = 400;

/** Preloading is a background optimisation, so it backs off more gently. */
const MAX_PRELOAD_ATTEMPTS = 3;
const PRELOAD_RETRY_BASE_MS = 1500;

// Live handles so a new run can cancel whatever the previous one left behind
// instead of racing it.
let generationWorker: Worker | null = null;
let generationRetryTimer: ReturnType<typeof setTimeout> | null = null;
let preloadWorker: Worker | null = null;
let preloadRetryTimer: ReturnType<typeof setTimeout> | null = null;

const createGeneratorWorker = () =>
  new Worker(new URL("../workers/puzzleGenerator.worker.ts", import.meta.url));

const backoffMs = (base: number, attempt: number) =>
  base * Math.pow(2, attempt - 1);

const logFailure = (
  label: string,
  reason: string,
  diagnostics?: GenerationDiagnostics,
) => {
  console.error(
    diagnostics
      ? `${label}: ${reason} — ${summarizeDiagnostics(diagnostics)}`
      : `${label}: ${reason}`,
  );
};

const cancelGeneration = () => {
  if (generationRetryTimer !== null) {
    clearTimeout(generationRetryTimer);
    generationRetryTimer = null;
  }
  generationWorker?.terminate();
  generationWorker = null;
};

const cancelPreload = () => {
  if (preloadRetryTimer !== null) {
    clearTimeout(preloadRetryTimer);
    preloadRetryTimer = null;
  }
  preloadWorker?.terminate();
  preloadWorker = null;
};

/**
 * Runs a single generation attempt, retrying up to MAX_GENERATION_ATTEMPTS
 * before parking the game in the terminal "error" state.
 *
 * Status deliberately stays "generating" across the backoff: the player really
 * is still waiting, and it keeps Board's "idle" effect from firing.
 */
const runGenerationAttempt = (attempt: number) => {
  cancelGeneration();

  const worker = createGeneratorWorker();
  generationWorker = worker;

  const release = () => {
    worker.terminate();
    if (generationWorker === worker) generationWorker = null;
  };

  const fail = (reason: string, diagnostics?: GenerationDiagnostics) => {
    release();
    logFailure(
      `Puzzle generation attempt ${attempt}/${MAX_GENERATION_ATTEMPTS} failed`,
      reason,
      diagnostics,
    );

    if (attempt >= MAX_GENERATION_ATTEMPTS) {
      useGameStore.setState({ status: "error" });
      return;
    }

    generationRetryTimer = setTimeout(
      () => runGenerationAttempt(attempt + 1),
      backoffMs(GENERATION_RETRY_BASE_MS, attempt),
    );
  };

  worker.onmessage = (e: MessageEvent<GenerationResult>) => {
    if (!e.data.success) {
      fail(e.data.error, e.data.diagnostics);
      return;
    }

    const { regions, solution, size } = e.data;
    release();
    useGameStore.setState({
      regions,
      solution,
      cells: new Array(size * size).fill(0),
      status: "playing",
      theme: getCurrentTheme(),
    });
    useGameStore.getState().preloadNextPuzzle();
  };

  // Without this a worker that throws or fails to load never posts a message,
  // and the game would sit on "generating" forever.
  worker.onerror = (event) => {
    fail(event.message || "Worker error");
  };

  worker.postMessage({ size: useGameStore.getState().gridSize });
};

/**
 * Same bounded-retry shape as generation, but failure is silent: a lost preload
 * only costs the player a loading screen on the next puzzle, so there is
 * nothing worth interrupting them about.
 */
const runPreloadAttempt = (attempt: number) => {
  cancelPreload();

  const worker = createGeneratorWorker();
  preloadWorker = worker;

  const release = () => {
    worker.terminate();
    if (preloadWorker === worker) preloadWorker = null;
  };

  const fail = (reason: string, diagnostics?: GenerationDiagnostics) => {
    release();
    logFailure(
      `Puzzle preload attempt ${attempt}/${MAX_PRELOAD_ATTEMPTS} failed`,
      reason,
      diagnostics,
    );

    if (attempt >= MAX_PRELOAD_ATTEMPTS) {
      useGameStore.setState({ isPreloading: false });
      return;
    }

    preloadRetryTimer = setTimeout(
      () => runPreloadAttempt(attempt + 1),
      backoffMs(PRELOAD_RETRY_BASE_MS, attempt),
    );
  };

  worker.onmessage = (e: MessageEvent<GenerationResult>) => {
    if (!e.data.success) {
      fail(e.data.error, e.data.diagnostics);
      return;
    }

    const { regions, solution, size } = e.data;
    release();
    useGameStore.setState({
      preloadedPuzzle: { regions, solution, size },
      isPreloading: false,
    });
  };

  worker.onerror = (event) => {
    fail(event.message || "Worker error");
  };

  worker.postMessage({ size: useGameStore.getState().gridSize });
};

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

    // Drop any generation still in flight or waiting out a backoff. Nothing
    // reaches this call mid-retry today, but a stale attempt that resolved
    // later would swap the board out from under a game in progress.
    cancelGeneration();

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
    runGenerationAttempt(1);
  },

  preloadNextPuzzle: () => {
    const { isPreloading } = get();
    if (isPreloading) return;

    // isPreloading stays true across the whole retry sequence, so a queued
    // backoff is not mistaken for "no preload running".
    set({ isPreloading: true });
    runPreloadAttempt(1);
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
    const newScoredQueens = [...scoredQueens];
    let newCombo = combo;
    let newLastCorrectMoveTime = lastCorrectMoveTime;
    const newLastMoveTime = timer;
    const newMovesCount = movesCount + 1;

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

  markCurrentWinSaved: () => {
    const { currentWinId } = get();
    if (!currentWinId) return;
    set({ savedWinId: currentWinId });
  },
}));
