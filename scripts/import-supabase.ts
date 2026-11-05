/**
 * Converts a folder of Supabase CSV exports into a SQL file for D1.
 *
 *   node --experimental-strip-types scripts/import-supabase.ts <folder> <out.sql>
 *   npx wrangler d1 execute queens --remote --file=<out.sql>
 *
 * The folder holds leaderboard.csv and, if those tables exist,
 * leaderboard_telemetry.csv and leaderboard_solve_log.csv.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { toInsertStatements } from "./supabaseImport/convert.ts";

const [folder, output] = process.argv.slice(2);

if (!folder || !output) {
  console.error("Usage: import-supabase.ts <folder> <out.sql>");
  process.exit(1);
}

const read = (name: string): string | undefined => {
  const path = join(folder, name);
  return existsSync(path) ? readFileSync(path, "utf8") : undefined;
};

const leaderboard = read("leaderboard.csv");

if (leaderboard === undefined) {
  console.error(`Missing ${join(folder, "leaderboard.csv")}`);
  process.exit(1);
}

const statements = toInsertStatements({
  leaderboard,
  telemetry: read("leaderboard_telemetry.csv"),
  solveLog: read("leaderboard_solve_log.csv"),
});

writeFileSync(output, `${statements.join("\n")}\n`);
console.log(`Wrote ${statements.length} statements to ${output}`);
