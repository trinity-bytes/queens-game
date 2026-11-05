import { describe, expect, it } from "vitest";
import { BAND_MULTIPLIER, scoreFor } from "./scoring";

describe("scoreFor", () => {
  it.each([
    ["gentle", 18000],
    ["tricky", 28800],
    ["brutal", 43200],
  ] as const)("pays a flawless %s 9x9 its full value", (band, expected) => {
    expect(scoreFor({ gridSize: 9, band, mistakes: 0 })).toBe(expected);
  });

  it("takes 8% of the value per mistake", () => {
    expect(scoreFor({ gridSize: 9, band: "tricky", mistakes: 3 })).toBe(21888);
  });

  it("never pays less than 20% of the value", () => {
    expect(scoreFor({ gridSize: 9, band: "gentle", mistakes: 10 })).toBe(3600);
    expect(scoreFor({ gridSize: 9, band: "gentle", mistakes: 500 })).toBe(3600);
  });

  it("matches exact decimal arithmetic for every reachable input", () => {
    // Postgres computed this in exact numerics. Tenths of a percent as
    // integers reproduce that, so a float drift here would reject real wins.
    const tenths = { gentle: 10, tricky: 16, brutal: 24 } as const;

    for (const band of ["gentle", "tricky", "brutal"] as const) {
      for (let gridSize = 4; gridSize <= 12; gridSize++) {
        for (let mistakes = 0; mistakes <= 500; mistakes++) {
          const value = (2000 * gridSize * tenths[band]) / 10;
          const accuracyPct = Math.max(20, 100 - 8 * mistakes);
          expect(scoreFor({ gridSize, band, mistakes })).toBe(
            (value * accuracyPct) / 100,
          );
        }
      }
    }
  });

  it("exposes the multipliers the victory screen displays", () => {
    expect(BAND_MULTIPLIER).toEqual({ gentle: 1, tricky: 1.6, brutal: 2.4 });
  });
});
