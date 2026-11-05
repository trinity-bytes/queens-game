import { BAND_MULTIPLIER, scoreFor } from "../../src/domain/scoring";
import type { DifficultyBand } from "../../src/workers/puzzleGenerator.types";

/**
 * What a won game must look like before it reaches the database. The client is
 * anonymous and untrusted, so this is the anti-cheat boundary: every field is
 * checked here, and the score is recomputed rather than believed.
 */

const MAX_NAME_LENGTH = 15;
const MAX_TIME_MS = 3_600_000;
const MIN_MOVES = 9;
const MAX_MOVES = 5000;
const MAX_MISTAKES = 500;
const MIN_GRID = 4;
const MAX_GRID = 12;
const MIN_WIN_ID_LENGTH = 5;
const MAX_WIN_ID_LENGTH = 64;
const MAX_LABEL_LENGTH = 64;

export interface SolveRecord {
  placements: unknown[];
  xMarksPlaced: number;
  peakXMarks: number;
  puzzlesAbandoned: number;
}

export interface Submission {
  winId: string;
  playerName: string;
  score: number;
  timeMs: number;
  mistakes: number;
  movesCount: number;
  gridSize: number;
  themeUsed: string;
  locale: string;
  appVersion: string | null;
  deviceType: string | null;
  difficultyBand: DifficultyBand;
  difficultyScore: number;
  solveLog: SolveRecord;
}

export type ParsedSubmission =
  | { ok: true; value: Submission }
  | { ok: false; error: string };

const fail = (error: string): ParsedSubmission => ({ ok: false, error });

const isIntegerBetween = (
  value: unknown,
  min: number,
  max: number,
): value is number =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= max;

const isLabel = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= MAX_LABEL_LENGTH;

const optionalLabel = (value: unknown): string | null =>
  isLabel(value) ? value : null;

const isBand = (value: unknown): value is DifficultyBand =>
  typeof value === "string" && Object.hasOwn(BAND_MULTIPLIER, value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Counts characters, not UTF-16 units, so an emoji is not cut in half. */
const normaliseName = (value: unknown): string =>
  typeof value === "string"
    ? Array.from(value.trim()).slice(0, MAX_NAME_LENGTH).join("")
    : "";

const counter = (value: unknown): number =>
  Number.isInteger(value) ? Math.max(0, value as number) : 0;

function parseSolveLog(value: unknown, movesCount: number): SolveRecord | null {
  const log = isRecord(value) ? value : {};
  const placements = log.placements ?? [];

  if (!Array.isArray(placements) || placements.length > movesCount) return null;

  return {
    placements,
    xMarksPlaced: counter(log.xMarksPlaced),
    peakXMarks: counter(log.peakXMarks),
    puzzlesAbandoned: counter(log.puzzlesAbandoned),
  };
}

export function parseSubmission(body: unknown): ParsedSubmission {
  if (!isRecord(body)) return fail("invalid submission");

  const {
    winId,
    score,
    timeMs,
    mistakes,
    movesCount,
    gridSize,
    themeUsed,
    locale,
    difficultyBand,
    difficultyScore,
  } = body;
  const playerName = normaliseName(body.playerName);

  if (playerName === "") return fail("invalid name");

  if (
    typeof winId !== "string" ||
    winId.length < MIN_WIN_ID_LENGTH ||
    winId.length > MAX_WIN_ID_LENGTH
  ) {
    return fail("invalid win id");
  }

  // The game clock only ever advances in whole seconds.
  if (
    !isIntegerBetween(timeMs, 1, MAX_TIME_MS) ||
    timeMs % 1000 !== 0
  ) {
    return fail("invalid time");
  }

  if (!isIntegerBetween(movesCount, MIN_MOVES, MAX_MOVES)) {
    return fail("invalid move count");
  }

  // Every mistake is a move, so a run cannot hold more of them than moves.
  if (
    !isIntegerBetween(mistakes, 0, MAX_MISTAKES) ||
    mistakes > movesCount
  ) {
    return fail("invalid mistake count");
  }

  if (!isIntegerBetween(gridSize, MIN_GRID, MAX_GRID)) {
    return fail("invalid grid size");
  }

  if (!isBand(difficultyBand)) return fail("invalid difficulty band");

  if (!isIntegerBetween(difficultyScore, 0, Number.MAX_SAFE_INTEGER)) {
    return fail("invalid difficulty score");
  }

  if (!isLabel(themeUsed)) return fail("invalid theme");
  if (!isLabel(locale)) return fail("invalid locale");

  const solveLog = parseSolveLog(body.solveLog, movesCount);
  if (!solveLog) return fail("invalid solve log");

  const expected = scoreFor({ gridSize, band: difficultyBand, mistakes });
  if (score !== expected) {
    return fail(
      `score does not match difficulty and mistakes (expected ${expected}, got ${String(score)})`,
    );
  }

  return {
    ok: true,
    value: {
      winId,
      playerName,
      score: expected,
      timeMs,
      mistakes,
      movesCount,
      gridSize,
      themeUsed,
      locale,
      appVersion: optionalLabel(body.appVersion),
      deviceType: optionalLabel(body.deviceType),
      difficultyBand,
      difficultyScore,
      solveLog,
    },
  };
}
