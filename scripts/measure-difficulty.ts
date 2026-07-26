// Samples the difficulty distribution of generated puzzles.
//
//   node --experimental-strip-types scripts/measure-difficulty.ts [count] [size]
//
// Exists so claims about difficulty stay checkable rather than assumed — the
// same reason the generator counts its own rejections by cause. It also acts
// as the solver's correctness gate: on a puzzle with a unique solution, a
// logical solve that disagrees with the generator's own answer means the
// solver made an unsound deduction, and the run reports it loudly.

import { generatePuzzle } from "../src/workers/puzzleGenerator.core.ts";
import {
  DIFFICULTY_TIERS,
  rateDifficulty,
  type DifficultyTier,
} from "../src/workers/puzzleSolver.ts";

const count = Number(process.argv[2] ?? 200);
const size = Number(process.argv[3] ?? 9);

const emptyTally = (): Record<DifficultyTier, number> => ({
  singles: 0,
  locking: 0,
  lookahead: 0,
  search: 0,
});

const tally = emptyTally();
const stepTotals = emptyTally();

let generationFailures = 0;
let solverDisagreements = 0;
let totalGenMs = 0;
let totalRateMs = 0;

/** Per-puzzle count of the expensive deductions, for the percentile report. */
const effortSamples: number[] = [];

for (let n = 0; n < count; n++) {
  const genStart = Date.now();
  // Explicitly unfiltered: this samples the natural distribution, which is
  // what the floor in generatePuzzle was chosen against in the first place.
  const result = generatePuzzle(size, null);
  totalGenMs += Date.now() - genStart;

  if (!result.success) {
    generationFailures++;
    continue;
  }

  const rateStart = Date.now();
  const report = rateDifficulty(result.regions, size);
  totalRateMs += Date.now() - rateStart;

  tally[report.tier]++;
  for (const tier of DIFFICULTY_TIERS) stepTotals[tier] += report.steps[tier];
  effortSamples.push(report.steps.lookahead);

  if (report.solvedByLogic) {
    const matches =
      report.solution!.length === result.solution.length &&
      report.solution!.every((col, row) => col === result.solution[row]);
    if (!matches) solverDisagreements++;
  }

  if ((n + 1) % 50 === 0) process.stdout.write(`  ...${n + 1}/${count}\n`);
}

const rated = count - generationFailures;

console.log(`\n=== ${count} puzzles at size ${size} ===`);
console.log(`generation failures : ${generationFailures}`);
console.log(`SOLVER DISAGREEMENTS: ${solverDisagreements}   (must be 0)`);
console.log(`avg generate        : ${(totalGenMs / count).toFixed(1)} ms`);
console.log(`avg rate            : ${(totalRateMs / rated).toFixed(2)} ms`);

console.log(`\nhardest technique the puzzle required:`);
for (const tier of DIFFICULTY_TIERS) {
  const share = tally[tier] / rated;
  console.log(
    `  ${tier.padEnd(10)} ${String(tally[tier]).padStart(4)}  ` +
      `${(share * 100).toFixed(1).padStart(5)}%  ${"#".repeat(Math.round(share * 40))}`,
  );
}

console.log(`\navg deductions per puzzle:`);
for (const tier of DIFFICULTY_TIERS) {
  console.log(`  ${tier.padEnd(10)} ${(stepTotals[tier] / rated).toFixed(2)}`);
}

// The tier alone saturates — nearly every puzzle needs some lookahead — so the
// usable signal is how MUCH lookahead it needs. These percentiles are what a
// difficulty threshold would actually be set against.
const sorted = [...effortSamples].sort((a, b) => a - b);
const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];

console.log(`\nlookahead deductions needed (the real difficulty signal):`);
console.log(`  min ${sorted[0]}   p25 ${at(0.25)}   median ${at(0.5)}   p75 ${at(0.75)}   p90 ${at(0.9)}   max ${sorted[sorted.length - 1]}`);

console.log(`\n  histogram:`);
const maxSeen = sorted[sorted.length - 1];
for (let v = 0; v <= maxSeen; v++) {
  const n = sorted.filter((s) => s === v).length;
  if (n === 0) continue;
  const share = n / rated;
  console.log(
    `  ${String(v).padStart(3)} lookahead  ${String(n).padStart(4)}  ` +
      `${(share * 100).toFixed(1).padStart(5)}%  ${"#".repeat(Math.round(share * 60))}`,
  );
}

// What a filter would cost: share of candidates surviving each threshold, and
// the multiplier that implies on generation time.
console.log(`\n  cost of filtering at each threshold:`);
for (const threshold of [1, 3, 5, 7, 9, 11, 13]) {
  const surviving = sorted.filter((s) => s >= threshold).length;
  if (surviving === 0) continue;
  const share = surviving / rated;
  console.log(
    `  >= ${String(threshold).padStart(2)} lookahead  keeps ${(share * 100).toFixed(1).padStart(5)}%  ` +
      `-> generation x${(1 / share).toFixed(2)}`,
  );
}
