import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import worker from "../index";
import { d1Repository } from "./d1Repository";
import { handleLeaderboard } from "./routes";

const win = (patch: Record<string, unknown> = {}) => ({
  winId: `win-${crypto.randomUUID()}`,
  playerName: "Queen",
  score: 28800,
  timeMs: 95000,
  mistakes: 0,
  movesCount: 12,
  gridSize: 9,
  themeUsed: "elephant",
  locale: "es",
  appVersion: "1.4.0",
  difficultyBand: "tricky",
  difficultyScore: 2,
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
  await env.DB.prepare("DELETE FROM leaderboard").run();
});

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
      score: 28800,
      difficulty_band: "tricky",
      difficulty_score: 2,
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

  it("keeps only the best 100 runs and removes their private rows", async () => {
    const statements = Array.from({ length: 100 }, (_, i) =>
      env.DB.prepare(
        `INSERT INTO leaderboard (id, win_id, player_name, score, time_ms, theme_used)
         VALUES (?, ?, 'Seed', 40000, ?, 'elephant')`,
      ).bind(`seed-${i}`, `seed-win-${i}`, (i + 1) * 1000),
    );
    await env.DB.batch(statements);

    const best = await post(win({ difficultyBand: "brutal", score: 43200 }));
    expect(best.status).toBe(201);
    expect(await count("leaderboard")).toBe(100);
    expect(await count("leaderboard_telemetry")).toBe(1);

    const worstSeed = await env.DB.prepare(
      "SELECT 1 FROM leaderboard WHERE id = 'seed-99'",
    ).first();
    expect(worstSeed).toBeNull();

    // Too low to make the board: valid, but not stored, and the response says
    // so instead of naming a row that does not exist.
    const outOfBoard = await post(win({ winId: "win-low" }));
    expect(outOfBoard.status).toBe(200);
    expect(await outOfBoard.json()).toEqual({ id: null });
    expect(await count("leaderboard")).toBe(100);
    expect(await count("leaderboard_telemetry")).toBe(1);
    expect(await count("leaderboard_solve_log")).toBe(1);
  });

  it("cascades private rows when a stored run leaves the board", async () => {
    await post(win({ winId: "win-gone" }));
    await env.DB.prepare("DELETE FROM leaderboard").run();

    expect(await count("leaderboard_telemetry")).toBe(0);
    expect(await count("leaderboard_solve_log")).toBe(0);
  });
});

describe("GET /api/leaderboard", () => {
  const seed = async () => {
    await post(win({ score: 18000, difficultyBand: "gentle", playerName: "C" }));
    await post(win({ timeMs: 90000, playerName: "A" }));
    await post(win({ timeMs: 95000, playerName: "B" }));
    await env.DB.prepare(
      `INSERT INTO leaderboard (id, win_id, player_name, score, time_ms, grid_size, theme_used)
       VALUES ('legacy', 'legacy-win', 'Other grid', 25600, 1000, 8, 'dog')`,
    ).run();
  };

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
