/**
 * Turns the CSV exports of the Supabase tables into SQL for D1.
 *
 * Pure on purpose: the same code runs from the CLI and from the tests, which
 * load its output into the real schema. Ids and win ids are kept, so a client
 * replaying a win across the cutover still dedupes.
 */

export type CsvRow = Record<string, string | null>;

export interface SupabaseExport {
  leaderboard: string;
  telemetry?: string;
  solveLog?: string;
}

type Encoder = (value: string | null) => string;

/** Parses CSV as Supabase writes it. An empty cell is SQL NULL there. */
export function parseCsv(csv: string): CsvRow[] {
  const records: string[][] = [];
  let record: string[] = [];
  let cell = "";
  let quoted = false;

  const text = csv.replace(/^﻿/, "");

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (quoted) {
      if (char !== '"') cell += char;
      else if (text[i + 1] === '"') cell += text[++i];
      else quoted = false;
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      record.push(cell);
      cell = "";
    } else if (char === "\n") {
      record.push(cell.replace(/\r$/, ""));
      records.push(record);
      record = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell !== "" || record.length > 0) {
    record.push(cell);
    records.push(record);
  }

  const [header = [], ...rows] = records;
  return rows.map((row) =>
    Object.fromEntries(header.map((name, i) => [name, row[i] || null])),
  );
}

const text: Encoder = (value) =>
  value === null ? "NULL" : `'${value.replaceAll("'", "''")}'`;

const integer =
  (column: string): Encoder =>
  (value) => {
    if (value === null) return "NULL";
    if (!/^-?\d+$/.test(value)) {
      throw new Error(`${column} is not an integer: "${value}"`);
    }
    return value;
  };

/** Postgres prints `2026-03-01 12:30:45.123456+00`; the schema stores ISO. */
const timestamp: Encoder = (value) => {
  if (value === null) return "NULL";

  const iso = value.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`invalid timestamp: "${value}"`);
  }
  return text(parsed.toISOString());
};

function inserts(
  table: string,
  columns: Record<string, Encoder>,
  csv: string,
): string[] {
  const names = Object.keys(columns);

  return parseCsv(csv).map((row) => {
    const values = names.map((name) => columns[name](row[name] ?? null));
    return `INSERT INTO ${table} (${names.join(", ")}) VALUES (${values.join(", ")});`;
  });
}

const LEADERBOARD_COLUMNS: Record<string, Encoder> = {
  id: text,
  win_id: text,
  player_name: text,
  score: integer("score"),
  time_ms: integer("time_ms"),
  mistakes: integer("mistakes"),
  moves_count: integer("moves_count"),
  grid_size: integer("grid_size"),
  theme_used: text,
  locale: text,
  difficulty_band: text,
  difficulty_score: integer("difficulty_score"),
  created_at: timestamp,
};

const TELEMETRY_COLUMNS: Record<string, Encoder> = {
  entry_id: text,
  user_agent: text,
  device_type: text,
  device_local_time: timestamp,
  app_version: text,
};

const SOLVE_LOG_COLUMNS: Record<string, Encoder> = {
  entry_id: text,
  placements: text,
  x_marks_placed: integer("x_marks_placed"),
  peak_x_marks: integer("peak_x_marks"),
  puzzles_abandoned: integer("puzzles_abandoned"),
};

/** Parents first: telemetry and solve logs reference leaderboard rows. */
export function toInsertStatements(source: SupabaseExport): string[] {
  return [
    ...inserts("leaderboard", LEADERBOARD_COLUMNS, source.leaderboard),
    ...inserts("leaderboard_telemetry", TELEMETRY_COLUMNS, source.telemetry ?? ""),
    ...inserts("leaderboard_solve_log", SOLVE_LOG_COLUMNS, source.solveLog ?? ""),
  ];
}
