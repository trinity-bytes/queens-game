import { describe, expect, it } from "vitest";
import { parseSubmission } from "./submission";

const valid = {
  winId: "win-12345",
  playerName: "  Queen  ",
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
};

const errorFor = (patch: Record<string, unknown>) => {
  const result = parseSubmission({ ...valid, ...patch });
  return result.ok ? null : result.error;
};

describe("parseSubmission", () => {
  it("accepts a legitimate win and normalises the name", () => {
    const result = parseSubmission(valid);
    expect(result).toMatchObject({
      ok: true,
      value: { playerName: "Queen", score: 28800, winId: "win-12345" },
    });
  });

  it("cuts names at 15 characters, counting an emoji as one", () => {
    const result = parseSubmission({ ...valid, playerName: "👑".repeat(20) });
    expect(result.ok && result.value.playerName).toBe("👑".repeat(15));
  });

  it.each([
    ["a non-object body", null],
    ["an array body", []],
  ])("rejects %s", (_, body) => {
    expect(parseSubmission(body)).toEqual({
      ok: false,
      error: "invalid submission",
    });
  });

  it.each([
    [{ playerName: "   " }, "invalid name"],
    [{ playerName: 7 }, "invalid name"],
    [{ timeMs: 0 }, "invalid time"],
    [{ timeMs: 3601000 }, "invalid time"],
    [{ timeMs: 1500 }, "invalid time"],
    [{ movesCount: 8 }, "invalid move count"],
    [{ movesCount: 5001 }, "invalid move count"],
    [{ movesCount: 9.5 }, "invalid move count"],
    [{ mistakes: -1 }, "invalid mistake count"],
    [{ mistakes: 501 }, "invalid mistake count"],
    [{ mistakes: 13 }, "invalid mistake count"],
    [{ gridSize: 8, score: 25600 }, "invalid grid size"],
    [{ gridSize: 12, score: 38400 }, "invalid grid size"],
    [{ difficultyBand: "legendary" }, "invalid difficulty band"],
    [{ difficultyBand: "constructor" }, "invalid difficulty band"],
    [{ difficultyScore: -1 }, "invalid difficulty score"],
    [{ difficultyScore: 2147483648 }, "invalid difficulty score"],
    [{ winId: "👑👑👑👑" }, "invalid win id"],
    [{ winId: "win\0-12345" }, "invalid win id"],
    [{ playerName: "Que\0en" }, "invalid name"],
    [{ winId: "abcd" }, "invalid win id"],
    [{ winId: "x".repeat(65) }, "invalid win id"],
    [{ themeUsed: "" }, "invalid theme"],
    [{ locale: "" }, "invalid locale"],
  ])("rejects %j", (patch, error) => {
    expect(errorFor(patch)).toBe(error);
  });

  it("measures win ids in characters, as the database does", () => {
    expect(errorFor({ winId: "👑".repeat(64) })).toBeNull();
  });

  it("rejects a score the band and mistakes cannot produce", () => {
    expect(errorFor({ score: 28801 })).toBe("invalid score");
  });

  it.each([
    ["a bare string", "x"],
    ["a missing time", { correct: true }],
    ["a negative time", { atMs: -1, correct: true }],
    ["a time past the limit", { atMs: 3_600_001, correct: true }],
    ["a non-boolean verdict", { atMs: 1000, correct: "yes" }],
  ])("rejects a placement that is %s", (_, placement) => {
    expect(
      errorFor({ solveLog: { placements: [placement] } }),
    ).toBe("invalid solve log");
  });

  it("keeps only the known fields of a placement", () => {
    const parsed = parseSubmission({
      ...valid,
      solveLog: { placements: [{ atMs: 1000, correct: true, note: "x".repeat(99) }] },
    });

    expect(parsed.ok && parsed.value.solveLog.placements).toEqual([
      { atMs: 1000, correct: true },
    ]);
  });

  it("strips control and direction characters from a name", () => {
    const parsed = parseSubmission({ ...valid, playerName: "Qu\u202Eeen\u200B\n" });

    expect(parsed.ok && parsed.value.playerName).toBe("Queen");
  });

  it("keeps the joiner that holds an emoji sequence together", () => {
    const family = "👩\u200D👧";
    const parsed = parseSubmission({ ...valid, playerName: family });

    expect(parsed.ok && parsed.value.playerName).toBe(family);
  });

  it("keeps the non-joiner that Persian spelling depends on", () => {
    const name = "می\u200Cخواهم";
    const parsed = parseSubmission({ ...valid, playerName: name });

    expect(parsed.ok && parsed.value.playerName).toBe(name);
  });

  it("keeps the tag characters of a subdivision flag", () => {
    const scotland = "🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}";
    const parsed = parseSubmission({ ...valid, playerName: scotland });

    expect(parsed.ok && parsed.value.playerName).toBe(scotland);
  });

  it.each([["\u200B\u202E"], ["\u200D"], ["\u200C\u200D"]])(
    "rejects the invisible name %j",
    (playerName) => {
      expect(errorFor({ playerName })).toBe("invalid name");
    },
  );

  it("rejects a solve log with more placements than moves", () => {
    const placements = Array(13).fill({ atMs: 1, correct: true });
    expect(errorFor({ solveLog: { ...valid.solveLog, placements } })).toBe(
      "invalid solve log",
    );
  });

  it("clamps negative solve counters to zero", () => {
    const result = parseSubmission({
      ...valid,
      solveLog: { ...valid.solveLog, xMarksPlaced: -4, puzzlesAbandoned: -1 },
    });
    expect(result).toMatchObject({
      ok: true,
      value: { solveLog: { xMarksPlaced: 0, puzzlesAbandoned: 0 } },
    });
  });

  it("treats a missing solve log as empty", () => {
    const result = parseSubmission({ ...valid, solveLog: undefined });
    expect(result).toMatchObject({
      ok: true,
      value: {
        solveLog: {
          placements: [],
          xMarksPlaced: 0,
          peakXMarks: 0,
          puzzlesAbandoned: 0,
        },
      },
    });
  });
});
