import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { parseCsv, toInsertStatements } from "./convert";

const LEADERBOARD = `id,win_id,player_name,score,time_ms,mistakes,moves_count,grid_size,theme_used,locale,created_at,difficulty_band,difficulty_score
aaaaaaaa-0000-0000-0000-000000000001,win-00001,"O'Brien, ""Q""",28800,95000,0,12,9,elephant,es,2026-03-01 12:30:45.123456+00,tricky,2
aaaaaaaa-0000-0000-0000-000000000002,legacy-win,👑 Reina,18000,120000,1,,9,cat,en,2025-01-02 03:04:05+00,,
`;

const TELEMETRY = `entry_id,user_agent,device_type,device_local_time,app_version
aaaaaaaa-0000-0000-0000-000000000001,"Mozilla/5.0 (X11; Linux)",desktop,2026-03-01 12:30:45+00,1.4.0
`;

const SOLVE_LOG = `entry_id,placements,x_marks_placed,peak_x_marks,puzzles_abandoned
aaaaaaaa-0000-0000-0000-000000000001,"[{""atMs"": 1000, ""correct"": true}]",4,3,1
`;

const load = async (statements: string[]) => {
  await env.DB.batch(statements.map((sql) => env.DB.prepare(sql)));
};

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM leaderboard").run();
});

describe("parseCsv", () => {
  it("handles quotes, embedded newlines, CRLF and a BOM", () => {
    expect(parseCsv('﻿a,b\r\n"x,""y""","line\nbreak"\r\n')).toEqual([
      { a: 'x,"y"', b: "line\nbreak" },
    ]);
  });

  it("reads an empty cell as null", () => {
    expect(parseCsv("a,b\n1,\n")).toEqual([{ a: "1", b: null }]);
  });
});

describe("toInsertStatements", () => {
  it("loads all three tables into the real schema", async () => {
    await load(
      toInsertStatements({
        leaderboard: LEADERBOARD,
        telemetry: TELEMETRY,
        solveLog: SOLVE_LOG,
      }),
    );

    const { results } = await env.DB.prepare(
      "SELECT * FROM leaderboard ORDER BY score DESC",
    ).all();

    expect(results).toEqual([
      {
        id: "aaaaaaaa-0000-0000-0000-000000000001",
        win_id: "win-00001",
        player_name: `O'Brien, "Q"`,
        score: 28800,
        time_ms: 95000,
        mistakes: 0,
        moves_count: 12,
        grid_size: 9,
        theme_used: "elephant",
        locale: "es",
        difficulty_band: "tricky",
        difficulty_score: 2,
        created_at: "2026-03-01T12:30:45.123Z",
      },
      {
        id: "aaaaaaaa-0000-0000-0000-000000000002",
        win_id: "legacy-win",
        player_name: "👑 Reina",
        score: 18000,
        time_ms: 120000,
        mistakes: 1,
        moves_count: null,
        grid_size: 9,
        theme_used: "cat",
        locale: "en",
        difficulty_band: null,
        difficulty_score: null,
        created_at: "2025-01-02T03:04:05.000Z",
      },
    ]);

    const telemetry = await env.DB.prepare(
      "SELECT * FROM leaderboard_telemetry",
    ).first();
    expect(telemetry).toMatchObject({
      user_agent: "Mozilla/5.0 (X11; Linux)",
      device_local_time: "2026-03-01T12:30:45.000Z",
      app_version: "1.4.0",
    });

    const log = await env.DB.prepare(
      "SELECT * FROM leaderboard_solve_log",
    ).first<{ placements: string; puzzles_abandoned: number }>();
    expect(JSON.parse(log!.placements)).toEqual([{ atMs: 1000, correct: true }]);
    expect(log!.puzzles_abandoned).toBe(1);
  });

  it("works when the database predates the optional tables and columns", async () => {
    const legacy = `id,win_id,player_name,score,time_ms,mistakes,moves_count,grid_size,theme_used,locale,created_at
aaaaaaaa-0000-0000-0000-000000000003,win-00003,Old,12000,60000,0,,9,cat,es,2025-01-02 03:04:05+00
`;
    await load(toInsertStatements({ leaderboard: legacy }));

    const row = await env.DB.prepare(
      "SELECT difficulty_band FROM leaderboard",
    ).first();
    expect(row).toEqual({ difficulty_band: null });
  });

  it("refuses a number column holding anything else", () => {
    const hostile = LEADERBOARD.replace("28800", "1); DROP TABLE leaderboard;--");
    expect(() => toInsertStatements({ leaderboard: hostile })).toThrow(
      'score is not an integer: "1); DROP TABLE leaderboard;--"',
    );
  });

  it("refuses an unreadable timestamp instead of inventing one", () => {
    const broken = LEADERBOARD.replace("2025-01-02 03:04:05+00", "yesterday");
    expect(() => toInsertStatements({ leaderboard: broken })).toThrow(
      'invalid timestamp: "yesterday"',
    );
  });
});
