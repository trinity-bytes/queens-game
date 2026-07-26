// Shared contract between the puzzle generator worker and its callers.
// Kept in its own module so the store can import the types without pulling the
// worker's generation code into the main bundle.

/**
 * Generation runs in two passes over the same search space:
 * - "strict"  requires a unique solution AND a trivial-region fraction <= 0.5
 * - "relaxed" drops the difficulty filter and requires only uniqueness
 */
export type GenerationPhase = "strict" | "relaxed";

/** Why a candidate layout was thrown away, counted per phase. */
export interface PhaseStats {
  phase: GenerationPhase;
  /** Seeds drawn from the backtracking queen placer. */
  seedsTried: number;
  /** Seeds where the placer found no valid configuration at all. */
  seedFailures: number;
  /** Region layouts built and tested. */
  candidates: number;
  rejectedRegionTooSmall: number;
  rejectedNonUnique: number;
  rejectedTrivial: number;
  elapsedMs: number;
}

export interface GenerationDiagnostics {
  size: number;
  elapsedMs: number;
  /** One entry per phase actually run, in order. */
  phases: PhaseStats[];
}

export interface GenerationSuccess {
  success: true;
  regions: number[];
  size: number;
  solution: number[];
  /** How hard the layout is to reason through, from the logical solver. */
  difficulty: PuzzleDifficulty;
  diagnostics: GenerationDiagnostics;
}

/**
 * The rating that ships with a puzzle.
 *
 * `lookaheads` is the raw signal — how many squares could only be ruled out by
 * playing a queen forward and watching a unit die. `band` is that number cut
 * into the thirds the generator actually produces, which is what the player
 * sees and what the score multiplies by.
 */
export interface PuzzleDifficulty {
  lookaheads: number;
  band: DifficultyBand;
  /** Hardest technique the solver needed; "search" means its ladder stalled. */
  technique: string;
}

export type DifficultyBand = "gentle" | "tricky" | "brutal";

export interface GenerationFailure {
  success: false;
  error: string;
  diagnostics: GenerationDiagnostics;
}

export type GenerationResult = GenerationSuccess | GenerationFailure;

/**
 * Flattens diagnostics into a single console-friendly line naming the phase
 * that ran and the filter that rejected the candidates.
 */
export function summarizeDiagnostics(
  diagnostics: GenerationDiagnostics,
): string {
  return diagnostics.phases
    .map(
      (p) =>
        `${p.phase}: ${p.candidates} candidates / ${p.seedsTried} seeds in ${p.elapsedMs}ms ` +
        `(regionTooSmall=${p.rejectedRegionTooSmall}, ` +
        `nonUnique=${p.rejectedNonUnique}, ` +
        `trivial=${p.rejectedTrivial}, ` +
        `seedFailures=${p.seedFailures})`,
    )
    .join(" | ");
}
