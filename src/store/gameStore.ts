import { create } from "zustand";

export type CellState = 0 | 1 | 2; // 0: empty, 1: X, 2: Queen
export type GameStatus = "idle" | "generating" | "playing" | "won";
export type Theme = "dino" | "dog" | "cow" | "potato" | "starwars";

interface GameState {
  gridSize: number;
  regions: number[];
  cells: CellState[];
  theme: Theme;
  timer: number;
  status: GameStatus;

  // Actions
  setGridSize: (size: number) => void;
  setTheme: (theme: Theme) => void;
  generatePuzzle: () => void;
  toggleCell: (index: number) => void;
  resetBoard: () => void;
  tickTimer: () => void;
  checkWinCondition: () => void;
}

const THEMES: Theme[] = ["dino", "dog", "cow", "potato", "starwars"];

export const useGameStore = create<GameState>((set, get) => ({
  gridSize: 8,
  regions: [],
  cells: [],
  theme: "dino",
  timer: 0,
  status: "idle",

  setGridSize: (size) => set({ gridSize: size }),
  setTheme: (theme) => set({ theme }),

  generatePuzzle: () => {
    set({ status: "generating", timer: 0, cells: [] });

    const worker = new Worker(
      new URL("../workers/puzzleGenerator.worker.ts", import.meta.url),
    );

    worker.onmessage = (e) => {
      if (e.data.success) {
        set({
          regions: e.data.regions,
          cells: new Array(e.data.size * e.data.size).fill(0),
          status: "playing",
          theme: THEMES[Math.floor(Math.random() * THEMES.length)],
        });
      } else {
        console.error(e.data.error);
        set({ status: "idle" });
      }
      worker.terminate();
    };

    worker.postMessage({ size: get().gridSize });
  },

  toggleCell: (index) => {
    const { cells, status } = get();
    if (status !== "playing") return;

    const newCells = [...cells];
    newCells[index] = ((newCells[index] + 1) % 3) as CellState;

    set({ cells: newCells });
    get().checkWinCondition();
  },

  resetBoard: () => {
    const { cells } = get();
    set({
      cells: new Array(cells.length).fill(0),
      timer: 0,
      status: "playing",
    });
  },

  tickTimer: () => {
    const { status } = get();
    if (status === "playing") {
      set((state) => ({ timer: state.timer + 1000 }));
    }
  },

  checkWinCondition: () => {
    const { cells, gridSize, regions } = get();

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

    // If we reach here, it's a win!
    set({ status: "won" });
  },
}));
