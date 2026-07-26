// src/workers/puzzleGenerator.worker.ts
//
// Message shim only. Everything it calls lives in puzzleGenerator.core, which
// stays free of worker globals so the same code can be exercised directly.

import { generatePuzzle } from "./puzzleGenerator.core";

self.onmessage = (e: MessageEvent) => {
  const { size } = e.data;
  self.postMessage(generatePuzzle(size));
};
