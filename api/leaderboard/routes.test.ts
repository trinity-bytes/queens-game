import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import worker from "../index";
import { d1Repository } from "./d1Repository";
import { handleLeaderboard } from "./routes";

const win = (patch: Record<string, unknown> = {}) => ({
  winId: `win-${crypto.randomUUID()}`,
  playerName: "Queen",
  score: 35280,
  timeMs: 95000,
  mistakes: 0,
  movesCount: 12,
  gridSize: 9,
  themeUsed: "elephant",
  locale: "es",
  appVersion: "1.4.0",
  difficultyBand: "tricky",
  difficultyScore: 8,
  deviceType: "mobile",
  solveLog: {
    placements: [{ atMs: 1000, correct: true }],
    xMarksPlaced: 4,
    peakXMarks: 3,
    puzzlesAbandoned: 1,
  },
  ...patch,
});

const call = (path: string, init?: RequestInit) =>
  worker.fetch(new Request(`https://queens.test${path}`, init), env);

const post = (body: unknown, headers: Record<string, string> = {}) =>
  call("/api/leaderboard", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const count = async (table: string) => {
  const row = await env.DB.prepare(`SELECT count(*) AS n FROM ${table}`).first<{
    n: number;
  }>();
  return row?.n;
};

beforeEach(async () => {
  // The research tables no longer empty with the board, so each is cleared.
  await env.DB.batch(
    ["leaderboard", "leaderboard_solve_log", "leaderboard_telemetry"].map(
      (table) => env.DB.prepare(`DELETE FROM ${table}`),
    ),
  );
});

/** An ISO timestamp the given number of days before now. */
const daysAgo = (days: number) =>
  new Date(Date.now() - days * 86_400_000).toISOString();

describe("POST /api/leaderboard", () => {
  it("stores the run, its telemetry and its solve log", async () => {
    const response = await post(win({ winId: "win-store" }), {
      "user-agent": "from-header",
    });

    expect(response.status).toBe(201);
    const { id } = await response.json<{ id: string }>();

    const entry = await env.DB.prepare(
      "SELECT * FROM leaderboard WHERE id = ?",
    )
      .bind(id)
      .first();
    expect(entry).toMatchObject({
      win_id: "win-store",
      player_name: "Queen",
      score: 35280,
      difficulty_band: "tricky",
      difficulty_score: 8,
    });

    const telemetry = await env.DB.prepare(
      "SELECT * FROM leaderboard_telemetry WHERE entry_id = ?",
    )
      .bind(id)
      .first();
    expect(telemetry).toMatchObject({
      user_agent: "from-header",
      device_type: "mobile",
      app_version: "1.4.0",
    });

    const log = await env.DB.prepare(
      "SELECT * FROM leaderboard_solve_log WHERE entry_id = ?",
    )
      .bind(id)
      .first<{ placements: string; x_marks_placed: number }>();
    expect(JSON.parse(log!.placements)).toEqual([{ atMs: 1000, correct: true }]);
    expect(log!.x_marks_placed).toBe(4);
  });

  it("is idempotent on the win id", async () => {
    const first = await post(win({ winId: "win-replay" }));
    const replay = await post(win({ winId: "win-replay", playerName: "Other" }));

    expect(replay.status).toBe(201);
    expect(await replay.json()).toEqual(await first.json());
    expect(await count("leaderboard")).toBe(1);
    expect(await count("leaderboard_telemetry")).toBe(1);
    expect(await count("leaderboard_solve_log")).toBe(1);

    const row = await env.DB.prepare(
      "SELECT player_name FROM leaderboard",
    ).first();
    expect(row).toEqual({ player_name: "Queen" });
  });

  it("survives two identical submissions racing each other", async () => {
    const body = win({ winId: "win-race" });
    const [a, b] = await Promise.all([post(body), post(body)]);

    expect(await a.json()).toEqual(await b.json());
    expect(await count("leaderboard")).toBe(1);
    expect(await count("leaderboard_telemetry")).toBe(1);
  });

  it("rejects a forged score and stores nothing", async () => {
    const response = await post(win({ score: 43200 }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid score" });
    expect(await count("leaderboard")).toBe(0);
  });

  it("rejects a body that is not JSON", async () => {
    const response = await post("{nope");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid submission" });
  });

  it("rejects an oversized body", async () => {
    const response = await post(
      win({ solveLog: { placements: ["x".repeat(300_000)] } }),
    );

    expect(response.status).toBe(413);
    expect(await count("leaderboard")).toBe(0);
  });

  it("refuses a declared oversized body without reading it", async () => {
    const response = await post(win(), { "content-length": "300000" });

    expect(response.status).toBe(413);
    expect(await count("leaderboard")).toBe(0);
  });

  it("rejects a body not declared as JSON", async () => {
    const response = await post(win(), { "content-type": "text/plain" });

    expect(response.status).toBe(415);
    expect(await count("leaderboard")).toBe(0);
  });

  it("cannot push real runs off the board with an unranked grid", async () => {
    const response = await post(win({ gridSize: 12, score: 38400 }));

    expect(response.status).toBe(400);
    expect(await count("leaderboard")).toBe(0);
  });

  it("turns away a submitter over the limit and stores nothing", async () => {
    const keys: string[] = [];
    const limiter = {
      limit: ({ key }: { key: string }) => {
        keys.push(key);
        return Promise.resolve({ success: false });
      },
    };
    const response = await handleLeaderboard(
      new Request("https://queens.test/api/leaderboard", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "cf-connecting-ip": "203.0.113.7",
        },
        body: JSON.stringify(win()),
      }),
      d1Repository(env.DB),
      limiter,
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    expect(await response.json()).toEqual({ error: "too many submissions" });
    expect(keys).toEqual(["203.0.113.7"]);
    expect(await count("leaderboard")).toBe(0);
  });

  it("does not limit reading the board", async () => {
    const limiter = { limit: () => Promise.resolve({ success: false }) };
    const response = await handleLeaderboard(
      new Request("https://queens.test/api/leaderboard"),
      d1Repository(env.DB),
      limiter,
    );

    expect(response.status).toBe(200);
  });

  it("keeps only the best 100 runs and keeps every solve log", async () => {
    const statements = Array.from({ length: 100 }, (_, i) =>
      env.DB.prepare(
        `INSERT INTO leaderboard (id, win_id, player_name, score, time_ms, theme_used)
         VALUES (?, ?, 'Seed', 40000, ?, 'elephant')`,
      ).bind(`seed-${i}`, `seed-win-${i}`, (i + 1) * 1000),
    );
    await env.DB.batch(statements);

    const best = await post(
      win({ difficultyBand: "brutal", difficultyScore: 12, score: 43920 }),
    );
    expect(best.status).toBe(201);
    expect(await count("leaderboard")).toBe(100);

    const worstSeed = await env.DB.prepare(
      "SELECT 1 FROM leaderboard WHERE id = 'seed-99'",
    ).first();
    expect(worstSeed).toBeNull();

    // Too low to make the board: valid, but not ranked, and the response says
    // so instead of naming a row that does not exist. Its research rows are
    // kept all the same.
    const outOfBoard = await post(win({ winId: "win-low" }));
    expect(outOfBoard.status).toBe(200);
    expect(await outOfBoard.json()).toEqual({ id: null });
    expect(await count("leaderboard")).toBe(100);
    expect(await count("leaderboard_telemetry")).toBe(2);
    expect(await count("leaderboard_solve_log")).toBe(2);

    const log = await env.DB.prepare(
      `SELECT grid_size, difficulty_score, time_ms, mistakes, moves_count
       FROM leaderboard_solve_log WHERE win_id = 'win-low'`,
    ).first();
    expect(log).toEqual({
      grid_size: 9,
      difficulty_score: 8,
      time_ms: 95000,
      mistakes: 0,
      moves_count: 12,
    });
  });

  it("keeps the research rows when a stored run leaves the board", async () => {
    await post(win({ winId: "win-gone" }));
    await env.DB.prepare("DELETE FROM leaderboard").run();

    expect(await count("leaderboard_telemetry")).toBe(1);
    expect(await count("leaderboard_solve_log")).toBe(1);
  });

  it("does not store a replayed win's research rows twice", async () => {
    await post(win({ winId: "win-replay" }));
    await env.DB.prepare("DELETE FROM leaderboard").run();
    await post(win({ winId: "win-replay" }));

    expect(await count("leaderboard_solve_log")).toBe(1);
    expect(await count("leaderboard_telemetry")).toBe(1);
    // Nor does the replay put the run back on the board.
    expect(await count("leaderboard")).toBe(0);
  });

  it("removes runs older than five days when a new one arrives", async () => {
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO leaderboard (id, win_id, player_name, score, time_ms, theme_used, created_at)
         VALUES ('old', 'old-win', 'Old', 90000, 1000, 'elephant', ?)`,
      ).bind(daysAgo(6)),
      env.DB.prepare(
        `INSERT INTO leaderboard (id, win_id, player_name, score, time_ms, theme_used, created_at)
         VALUES ('recent', 'recent-win', 'Recent', 90000, 1000, 'elephant', ?)`,
      ).bind(daysAgo(4)),
    ]);

    await post(win());

    const ids = await env.DB.prepare("SELECT id FROM leaderboard").all<{
      id: string;
    }>();
    expect(ids.results.map((row) => row.id)).not.toContain("old");
    expect(ids.results.map((row) => row.id)).toContain("recent");
  });

  it("accepts a score above the old band ceiling", async () => {
    const response = await post(
      win({ difficultyBand: "brutal", difficultyScore: 36, score: 95760 }),
    );
    expect(response.status).toBe(201);
  });
});

describe("GET /api/leaderboard", () => {
  const seed = async () => {
    await post(win({ score: 18000, difficultyBand: "gentle", difficultyScore: 0, playerName: "C" }));
    await post(win({ timeMs: 90000, playerName: "A" }));
    await post(win({ timeMs: 95000, playerName: "B" }));
    await env.DB.prepare(
      `INSERT INTO leaderboard (id, win_id, player_name, score, time_ms, grid_size, theme_used)
       VALUES ('legacy', 'legacy-win', 'Other grid', 25600, 1000, 8, 'dog')`,
    ).run();
  };

  it("shows only runs from the last five days", async () => {
    await post(win({ playerName: "Fresh" }));
    // Inserted straight into the table: the trigger would remove it on the
    // next submission, but the board must hide it even if none comes.
    await env.DB.prepare(
      `INSERT INTO leaderboard (id, win_id, player_name, score, time_ms, theme_used, created_at)
       VALUES ('stale', 'stale-win', 'Stale', 90000, 1000, 'elephant', ?)`,
    )
      .bind(daysAgo(5.1))
      .run();

    const response = await call("/api/leaderboard");
    const entries = await response.json<{ player_name: string }[]>();
    expect(entries.map((e) => e.player_name)).toEqual(["Fresh"]);
  });

  it("ranks 9x9 runs by score, then by time", async () => {
    await seed();
    const response = await call("/api/leaderboard?limit=10");
    const entries = await response.json<{ player_name: string }[]>();

    expect(response.status).toBe(200);
    expect(entries.map((e) => e.player_name)).toEqual(["A", "B", "C"]);
  });

  it("exposes only the public columns", async () => {
    await seed();
    const response = await call("/api/leaderboard");
    const [entry] = await response.json<Record<string, unknown>[]>();

    expect(Object.keys(entry).sort()).toEqual([
      "created_at",
      "grid_size",
      "id",
      "mistakes",
      "moves_count",
      "player_name",
      "score",
      "time_ms",
    ]);
  });

  it("is never cached, so polling always sees the database", async () => {
    const response = await call("/api/leaderboard");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("honours an explicit limit", async () => {
    await seed();
    const response = await call("/api/leaderboard?limit=2");
    expect(await response.json<unknown[]>()).toHaveLength(2);
  });

  it("returns the whole board when no limit is given", async () => {
    await seed();
    const response = await call("/api/leaderboard");
    expect(await response.json<unknown[]>()).toHaveLength(3);
  });

  it.each(["0", "-1", "2.5", "abc", "", "101"])(
    "rejects limit=%s instead of ignoring it",
    async (limit) => {
      const response = await call(`/api/leaderboard?limit=${limit}`);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "invalid limit" });
    },
  );
});

describe("routing", () => {
  it("answers 404 for an unknown path", async () => {
    const response = await call("/api/nope");
    expect(response.status).toBe(404);
  });

  it("answers 405 for an unsupported method", async () => {
    const response = await call("/api/leaderboard", { method: "DELETE" });
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, POST");
  });

  it("hides storage failures from the client", async () => {
    const failing = {
      topScores: () => Promise.reject(new Error("D1_ERROR: secret detail")),
      save: () => Promise.reject(new Error("D1_ERROR: secret detail")),
    };
    const response = await handleLeaderboard(
      new Request("https://queens.test/api/leaderboard"),
      failing,
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "internal error" });
  });
});
