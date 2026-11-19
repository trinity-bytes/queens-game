import { describe, expect, it } from "vitest";
import {
  bandFor,
  maxRating,
  puzzleValue,
  ratingMultiplier,
  scoreFor,
} from "./scoring";

describe("scoreFor", () => {
  it.each([
    [0, 18000],
    [12, 43920],
    [24, 69840],
    [36, 95760],
  ])("pays a flawless 9x9 of rating %i its full value", (rating, expected) => {
    expect(scoreFor({ gridSize: 9, rating, mistakes: 0 })).toBe(expected);
  });

  it("pays two brutal boards of different depth differently", () => {
    const shallow = scoreFor({ gridSize: 9, rating: 12, mistakes: 0 });
    const deep = scoreFor({ gridSize: 9, rating: 13, mistakes: 0 });
    expect(deep - shallow).toBe(2160);
  });

  it("takes 8% of the value per mistake", () => {
    expect(scoreFor({ gridSize: 9, rating: 10, mistakes: 3 })).toBe(30096);
  });

  it("never pays less than 20% of the value", () => {
    expect(scoreFor({ gridSize: 9, rating: 0, mistakes: 10 })).toBe(3600);
    expect(scoreFor({ gridSize: 9, rating: 0, mistakes: 500 })).toBe(3600);
  });

  it("matches exact integer arithmetic for every reachable input", () => {
    // The browser and the Worker must agree to the point, so a float drift
    // here would reject real wins.
    for (let gridSize = 4; gridSize <= 12; gridSize++) {
      for (let rating = 0; rating <= maxRating(gridSize); rating++) {
        for (let mistakes = 0; mistakes <= 15; mistakes++) {
          const value = 20 * gridSize * (100 + 12 * rating);
          const accuracyPct = Math.max(20, 100 - 8 * mistakes);
          expect(scoreFor({ gridSize, rating, mistakes })).toBe(
            Math.round((value * accuracyPct) / 100),
          );
        }
      }
    }
  });
});

describe("puzzleValue", () => {
  it("tops out at the bound the database enforces", () => {
    expect(puzzleValue(12, maxRating(12))).toBe(438720);
  });

  it("is a whole number for every rating", () => {
    for (let rating = 0; rating <= maxRating(12); rating++) {
      expect(Number.isInteger(puzzleValue(12, rating))).toBe(true);
    }
  });
});

describe("ratingMultiplier", () => {
  it("adds 12% per lookahead", () => {
    expect(ratingMultiplier(0)).toBe(1);
    expect(ratingMultiplier(24)).toBe(3.88);
  });
});

describe("bandFor", () => {
  it.each([
    [0, "gentle"],
    [6, "gentle"],
    [7, "tricky"],
    [11, "tricky"],
    [12, "brutal"],
    [81, "brutal"],
  ] as const)("names rating %i %s", (rating, band) => {
    expect(bandFor(rating)).toBe(band);
  });
});
