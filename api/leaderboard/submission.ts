import { BAND_MULTIPLIER, scoreFor } from "../../src/domain/scoring";
import type { DifficultyBand } from "../../src/workers/puzzleGenerator.types";

/**
 * What a won game must look like before it reaches the database. The client is
 * anonymous and untrusted, so this is the anti-cheat boundary: every field is
 * checked here, and the score is recomputed rather than believed.
 */

const MAX_NAME_LENGTH = 15;
const MAX_TIME_MS = 3_600_000;
const MAX_MOVES = 5000;
const MAX_MISTAKES = 500;
/**
 * The only grid the game deals and the board ranks. The database keeps the best
 * 100 runs of any grid, so a larger one, which scores higher and is never shown,
 * would silently push every real run out.
 */
export const RANKED_GRID_SIZE = 9;
const MIN_WIN_ID_LENGTH = 5;
const MAX_WIN_ID_LENGTH = 64;
const MAX_LABEL_LENGTH = 64;
/** The column was an int4 in Postgres; nothing legitimate comes close. */
const MAX_DIFFICULTY_SCORE = 2_147_483_647;

export interface Placement {
  atMs: number;
  correct: boolean;
}

export interface SolveRecord {
  placements: Placement[];
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

/** SQLite's length() stops at a NUL, so such a string cannot be measured. */
const hasNul = (value: string): boolean => value.includes("\0");

/**
 * Control and format characters, which can reverse the text around them on the
 * public board or make a name invisible. The zero-width joiner stays, because
 * it is what holds an emoji sequence together.
 */
const INVISIBLE_CHARACTERS = /(?!\u200D)[\p{Cc}\p{Cf}]/gu;

/** Counts characters, not UTF-16 units, so an emoji is not cut in half. */
const normaliseName = (value: unknown): string =>
  typeof value === "string" && !hasNul(value)
    ? Array.from(value.replace(INVISIBLE_CHARACTERS, "").trim())
        .slice(0, MAX_NAME_LENGTH)
        .join("")
    : "";

/** Measured in characters, as the database's length check does. */
const isWinId = (value: unknown): value is string =>
  typeof value === "string" &&
  !hasNul(value) &&
  Array.from(value).length >= MIN_WIN_ID_LENGTH &&
  Array.from(value).length <= MAX_WIN_ID_LENGTH;

const counter = (value: unknown): number =>
  Number.isInteger(value) ? Math.max(0, value as number) : 0;

const isPlacement = (
  value: unknown,
): value is Record<string, unknown> & Placement =>
  isRecord(value) &&
  isIntegerBetween(value.atMs, 0, MAX_TIME_MS) &&
  typeof value.correct === "boolean";

function parseSolveLog(value: unknown, movesCount: number): SolveRecord | null {
  const log = isRecord(value) ? value : {};
  const placements = log.placements ?? [];

  if (
    !Array.isArray(placements) ||
    placements.length > movesCount ||
    !placements.every(isPlacement)
  ) {
    return null;
  }

  return {
    // Rebuilt field by field, so nothing else in the body reaches the database.
    placements: placements.map(({ atMs, correct }) => ({ atMs, correct })),
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

  if (!isWinId(winId)) return fail("invalid win id");

  // The game clock only ever advances in whole seconds.
  if (
    !isIntegerBetween(timeMs, 1, MAX_TIME_MS) ||
    timeMs % 1000 !== 0
  ) {
    return fail("invalid time");
  }

  if (gridSize !== RANKED_GRID_SIZE) return fail("invalid grid size");

  // Solving a board takes at least one move per queen.
  if (!isIntegerBetween(movesCount, RANKED_GRID_SIZE, MAX_MOVES)) {
    return fail("invalid move count");
  }

  // Every mistake is a move, so a run cannot hold more of them than moves.
  if (
    !isIntegerBetween(mistakes, 0, MAX_MISTAKES) ||
    mistakes > movesCount
  ) {
    return fail("invalid mistake count");
  }

  if (!isBand(difficultyBand)) return fail("invalid difficulty band");

  if (!isIntegerBetween(difficultyScore, 0, MAX_DIFFICULTY_SCORE)) {
    return fail("invalid difficulty score");
  }

  if (!isLabel(themeUsed)) return fail("invalid theme");
  if (!isLabel(locale)) return fail("invalid locale");

  const solveLog = parseSolveLog(body.solveLog, movesCount);
  if (!solveLog) return fail("invalid solve log");

  const expected = scoreFor({ gridSize, band: difficultyBand, mistakes });
  // The expected value stays out of the message: it would hand a forger the
  // exact number to send.
  if (score !== expected) return fail("invalid score");

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
