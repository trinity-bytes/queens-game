import { create } from "zustand";
import { getCurrentTheme } from "@/lib/themeSelector";
import { Locale, getInitialLocale, setStoredLocale } from "@/lib/i18n";
import { setSoundEnabled } from "@/lib/sound";
import { puzzleValue, scoreFor } from "@/domain/scoring";
import {
  settleMove,
  WHOLE_BOARD,
  type PendingQueen,
} from "@/domain/mistakes";
import {
  summarizeDiagnostics,
  type GenerationDiagnostics,
  type GenerationResult,
  type PuzzleDifficulty,
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
  difficulty: PuzzleDifficulty;
}

/**
 * What the player did, not just how they finished.
 *
 * Scoring currently rewards difficulty and accuracy only, because how long a
 * human *should* take on a given rating is not something anyone has measured
 * yet. This is the record that will answer it: the gaps between placements
 * describe the shape of a solve — steady, or stuck then sudden — which is the
 * part that separates skill from luck.
 */
export interface SolveLog {
  /**
   * Elapsed ms at each queen played, right or wrong, in order. A queen the
   * next move took straight off is a cell passing through, not a placement.
   */
  placements: { atMs: number; correct: boolean }[];
  /** Times a cell was marked X, the notation this game no longer punishes. */
  xMarksPlaced: number;
  /** Most X marks standing at once — how heavily the player annotated. */
  peakXMarks: number;
  /**
   * Puzzles walked away from mid-play before this win, persisted across
   * reloads. Without it a player rerolling for an easy board looks identical
   * to one who sat down and solved the first thing they saw.
   */
  puzzlesAbandoned: number;
}

/** One step Undo can take back. */
export interface Move {
  /** The cell the move acted on, or WHOLE_BOARD. */
  index: number;
  /** The board as it stood before the move. */
  cells: CellState[];
  /** The unsettled queen this move took off, which Undo puts back unsettled. */
  passed: PendingQueen | null;
}

interface GameState {
  gridSize: number;
  regions: number[];
  solution: number[];
  cells: CellState[];
  theme: Theme;
  timer: number;
  mistakes: number;
  /** The queen placed by the last move, which that move's successor settles. */
  pendingQueen: PendingQueen | null;
  history: Move[];
  xPenalties: number;
  score: number;
  grossScore: number;
  totalPenalties: number;
  scoredQueens: number[];
  lastCorrectMoveTime: number;
  lastMoveTime: number;
  movesCount: number;
  /** Rating of the puzzle in play, null until one is loaded. */
  difficulty: PuzzleDifficulty | null;
  /** Behavioural record of the current solve, for calibrating scoring later. */
  solveLog: SolveLog;
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
  undo: () => void;
  clearBoard: () => void;
  tickTimer: () => void;
  checkWinCondition: () => void;
  markCurrentWinSaved: () => void;
}

const ABANDONED_STORAGE_KEY = "puzzles-abandoned";

// Persisted because reloading the page is the cheapest way to reroll a puzzle,
// and an in-memory counter would reset on exactly the action worth counting.
const getAbandonedCount = (): number => {
  if (typeof window === "undefined") return 0;
  const stored = Number(localStorage.getItem(ABANDONED_STORAGE_KEY));
  return Number.isFinite(stored) && stored > 0 ? stored : 0;
};

const emptySolveLog = (): SolveLog => ({
  placements: [],
  xMarksPlaced: 0,
  peakXMarks: 0,
  puzzlesAbandoned: getAbandonedCount(),
});

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

    const { regions, solution, size, difficulty } = e.data;
    release();
    useGameStore.setState({
      regions,
      solution,
      difficulty,
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

    const { regions, solution, size, difficulty } = e.data;
    release();
    useGameStore.setState({
      preloadedPuzzle: { regions, solution, size, difficulty },
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
  pendingQueen: null,
  history: [],
  xPenalties: 0,
  score: 0,
  grossScore: 0,
  totalPenalties: 0,
  scoredQueens: [],
  lastCorrectMoveTime: 0,
  lastMoveTime: 0,
  movesCount: 0,
  difficulty: null,
  solveLog: emptySolveLog(),
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
    const { preloadedPuzzle, gridSize, status } = get();

    // Leaving a game in progress is the reroll this counter exists to see. A
    // puzzle left at move zero still counts: walking away before touching the
    // board is the cheapest reroll of all.
    if (status === "playing") {
      const abandoned = getAbandonedCount() + 1;
      localStorage.setItem(ABANDONED_STORAGE_KEY, String(abandoned));
    }

    // Drop any generation still in flight or waiting out a backoff. Nothing
    // reaches this call mid-retry today, but a stale attempt that resolved
    // later would swap the board out from under a game in progress.
    cancelGeneration();

    // Reset game stats
    set({
      timer: 0,
      mistakes: 0,
      pendingQueen: null,
      history: [],
      score: 0,
      grossScore: 0,
      totalPenalties: 0,
      scoredQueens: [],
      lastCorrectMoveTime: 0,
      lastMoveTime: 0,
      movesCount: 0,
      cells: [],
      difficulty: null,
      solveLog: emptySolveLog(),
      currentWinId: null,
      savedWinId: null,
    });

    // If we have a preloaded puzzle for the current size, use it immediately
    if (preloadedPuzzle && preloadedPuzzle.size === gridSize) {
      set({
        regions: preloadedPuzzle.regions,
        solution: preloadedPuzzle.solution,
        difficulty: preloadedPuzzle.difficulty,
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
      pendingQueen,
      history,
      scoredQueens,
      solveLog,
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

    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    const placed = newState === 2 ? { correct: solution[row] === col } : null;
    const { tally, passedThrough } = settleMove(
      { mistakes, pending: pendingQueen },
      index,
      placed,
    );

    const newScoredQueens = [...scoredQueens];
    let newLastCorrectMoveTime = lastCorrectMoveTime;
    const newLastMoveTime = timer;
    const newMovesCount = movesCount + 1;
    const newLog: SolveLog = { ...solveLog };

    if (newState === 1) {
      // Marking a cell is how the puzzle is meant to be worked. It used to
      // cost 50 points if the mark stood for two seconds; now it is simply
      // recorded, because how heavily a player annotates is a skill signal.
      newLog.xMarksPlaced = solveLog.xMarksPlaced + 1;
      const standing = newCells.filter((cell) => cell === 1).length;
      newLog.peakXMarks = Math.max(solveLog.peakXMarks, standing);
    }

    if (passedThrough) {
      newLog.placements = solveLog.placements.slice(0, -1);
    }

    if (placed) {
      newLog.placements = [
        ...solveLog.placements,
        { atMs: timer, correct: placed.correct },
      ];

      if (placed.correct && !newScoredQueens.includes(index)) {
        newScoredQueens.push(index);
        newLastCorrectMoveTime = timer;
      }
    }

    set({
      cells: newCells,
      mistakes: tally.mistakes,
      pendingQueen: tally.pending,
      history: [
        ...history,
        { index, cells, passed: passedThrough ? pendingQueen : null },
      ],
      scoredQueens: newScoredQueens,
      solveLog: newLog,
      lastCorrectMoveTime: newLastCorrectMoveTime,
      lastMoveTime: newLastMoveTime,
      movesCount: newMovesCount,
    });
    get().checkWinCondition();
  },

  /**
   * Takes back the last change. It is a move like any other: the API requires
   * every placement to fit within movesCount, so the count only ever grows, and
   * an error already settled stays on the record.
   */
  undo: () => {
    const { history, status, mistakes, pendingQueen, solveLog, movesCount, timer } =
      get();
    const last = history[history.length - 1];
    if (status !== "playing" || !last) return;

    const { tally, passedThrough } = settleMove(
      { mistakes, pending: pendingQueen },
      last.index,
      null,
    );

    const placements = passedThrough
      ? solveLog.placements.slice(0, -1)
      : solveLog.placements;

    set({
      cells: last.cells,
      history: history.slice(0, -1),
      mistakes: tally.mistakes,
      pendingQueen: last.passed ?? tally.pending,
      solveLog: {
        ...solveLog,
        placements: last.passed
          ? [...placements, { atMs: timer, correct: last.passed.correct }]
          : placements,
      },
      movesCount: movesCount + 1,
      lastMoveTime: timer,
    });
  },

  /** Empties the board. The clock keeps running, so it cannot reset a bad time. */
  clearBoard: () => {
    const { cells, status, mistakes, pendingQueen, history, movesCount, timer } =
      get();
    if (status !== "playing" || cells.every((cell) => cell === 0)) return;

    const { tally } = settleMove(
      { mistakes, pending: pendingQueen },
      WHOLE_BOARD,
      null,
    );

    set({
      cells: new Array(cells.length).fill(0),
      history: [...history, { index: WHOLE_BOARD, cells, passed: null }],
      mistakes: tally.mistakes,
      pendingQueen: tally.pending,
      movesCount: movesCount + 1,
      lastMoveTime: timer,
    });
  },

  /**
   * Advances the clock, and nothing else.
   *
   * This used to bleed points every second at a rate that grew with the time
   * since the last move — 5 points, then 10, then 15 — so a minute spent
   * studying the board cost around 9,450. It was the harshest of the old
   * speed proxies and the reason the database still assumes a long game and a
   * high score are mutually exclusive. The clock is now recorded, not charged
   * for.
   */
  tickTimer: () => {
    if (get().status !== "playing") return;
    set((state) => ({ timer: state.timer + 1000 }));
  },

  checkWinCondition: () => {
    const { cells, gridSize, regions, mistakes, difficulty } = get();

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

    // Scored here rather than move by move: nothing is shown until the puzzle
    // is solved anyway, and a single formula over the finished game is easier
    // to reason about — and to re-check on the server.
    //
    // The band falls back to the cheapest one if a puzzle somehow arrived
    // unrated, so a missing rating can never inflate a score.
    const band = difficulty?.band ?? "gentle";
    const value = puzzleValue(gridSize, band);
    const finalScore = scoreFor({ gridSize, band, mistakes });

    // A win ends the reroll streak: the count belongs to the game it produced.
    localStorage.removeItem(ABANDONED_STORAGE_KEY);

    set({
      status: "won",
      score: finalScore,
      grossScore: value,
      totalPenalties: value - finalScore,
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
