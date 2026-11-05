import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

type FetchListener = (event: {
  request: { method: string; url: string; mode: string };
  respondWith: (response: unknown) => void;
  waitUntil: (work: unknown) => void;
}) => void;

let onFetch: FetchListener;

beforeAll(async () => {
  vi.stubGlobal("self", {
    location: { origin: "https://queens.test" },
    addEventListener: (type: string, listener: FetchListener) => {
      if (type === "fetch") onFetch = listener;
    },
  });
  vi.stubGlobal("caches", {
    open: async () => ({ match: async () => "cached", put: () => {} }),
  });
  vi.stubGlobal("fetch", async () => new Response("network"));
  // @ts-expect-error plain script outside the module graph
  await import("../../public/sw.js");
});

afterAll(() => {
  vi.unstubAllGlobals();
});

const intercepts = (path: string) => {
  const respondWith = vi.fn();
  onFetch({
    request: {
      method: "GET",
      url: `https://queens.test${path}`,
      mode: "cors",
    },
    respondWith,
    waitUntil: () => {},
  });
  return respondWith.mock.calls.length > 0;
};

describe("service worker", () => {
  it("leaves the API to the network, so polling never reads a stale board", () => {
    expect(intercepts("/api/leaderboard?limit=50")).toBe(false);
  });

  it("still serves static assets from its cache", () => {
    expect(intercepts("/assets/figures/queen.png")).toBe(true);
  });
});
