import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTopScores, submitScore, type ScoreSubmission } from "./leaderboard";

const submission: ScoreSubmission = {
  winId: "win-12345",
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
  solveLog: {
    placements: [{ atMs: 1000, correct: true }],
    xMarksPlaced: 4,
    peakXMarks: 3,
    puzzlesAbandoned: 1,
  },
};

const stubFetch = (response: Response) => {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchTopScores", () => {
  it("asks the API for the requested number of runs", async () => {
    const entries = [{ id: "a", player_name: "Queen" }];
    const fetchMock = stubFetch(Response.json(entries));

    await expect(fetchTopScores(50)).resolves.toEqual(entries);
    expect(fetchMock).toHaveBeenCalledWith("/api/leaderboard?limit=50");
  });

  it("throws when the API fails, so the caller keeps its last good board", async () => {
    stubFetch(Response.json({ error: "internal error" }, { status: 500 }));

    await expect(fetchTopScores(10)).rejects.toThrow("internal error");
  });
});

describe("submitScore", () => {
  it("posts the run with the device class", async () => {
    vi.stubGlobal("window", { innerWidth: 500 });
    const fetchMock = stubFetch(Response.json({ id: "a" }, { status: 201 }));

    await submitScore(submission);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/leaderboard");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "content-type": "application/json" });
    expect(JSON.parse(init.body)).toEqual({
      ...submission,
      deviceType: "mobile",
    });
  });

  it("throws the server's reason when a run is rejected", async () => {
    vi.stubGlobal("window", { innerWidth: 1200 });
    stubFetch(Response.json({ error: "invalid name" }, { status: 400 }));

    await expect(submitScore(submission)).rejects.toThrow("invalid name");
  });
});
