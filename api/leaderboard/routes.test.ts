import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import worker from "../index";
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
    expect(await response.json()).toEqual({
      error:
        "score does not match difficulty and mistakes (expected 28800, got 43200)",
    });
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

    // Too low to make the board: accepted, then bounded straight back out,
    // without leaving private rows behind.
    const outOfBoard = await post(win({ winId: "win-low" }));
    expect(outOfBoard.status).toBe(201);
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
    await post(
      win({
        gridSize: 8,
        score: 25600,
        playerName: "Other grid",
      }),
    );
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

  it.each([
    ["2", 2],
    ["0", 3],
    ["abc", 3],
    ["1000", 3],
  ])("honours limit=%s", async (limit, expected) => {
    await seed();
    const response = await call(`/api/leaderboard?limit=${limit}`);
    expect(await response.json<unknown[]>()).toHaveLength(expected);
  });
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
