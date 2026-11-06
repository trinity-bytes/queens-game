import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { THEMES } from "./themeSelector";

type FetchListener = (event: {
  request: { method: string; url: string; mode: string };
  respondWith: (response: unknown) => void;
  waitUntil: (work: unknown) => void;
}) => void;

type InstallListener = (event: { waitUntil: (work: unknown) => void }) => void;

let onFetch: FetchListener;
let onInstall: InstallListener;
const precached: string[] = [];

beforeAll(async () => {
  vi.stubGlobal("self", {
    location: { origin: "https://queens.test" },
    skipWaiting: async () => {},
    addEventListener: (type: string, listener: unknown) => {
      if (type === "fetch") onFetch = listener as FetchListener;
      if (type === "install") onInstall = listener as InstallListener;
    },
  });
  vi.stubGlobal("caches", {
    open: async () => ({
      match: async () => "cached",
      put: () => {},
      add: async (path: string) => {
        precached.push(path);
      },
    }),
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
  it("holds every figure at install, so a theme never first appears offline", async () => {
    let installed: unknown;
    onInstall({ waitUntil: (work) => (installed = work) });
    await installed;

    expect(precached).toEqual(
      expect.arrayContaining([
        ...THEMES.map((theme) => `/assets/figures/${theme}.png`),
        "/assets/figures/queen.png",
        "/assets/figures/x-mark.png",
      ]),
    );
  });

  it("leaves the API to the network, so polling never reads a stale board", () => {
    expect(intercepts("/api/leaderboard?limit=50")).toBe(false);
  });

  it("still serves static assets from its cache", () => {
    expect(intercepts("/assets/figures/queen.png")).toBe(true);
  });
});
