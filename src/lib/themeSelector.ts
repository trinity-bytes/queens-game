import { Theme } from "@/store/gameStore";

const THEMES: Theme[] = [
  "dino",
  "dog",
  "cow",
  "potato",
  "starwars",
  "elephant",
];

// Seeded random number generator (Mulberry32)
function mulberry32(seed: number) {
  // Hash the sequential seed to destroy linear correlations before starting PRNG
  let a = seed;
  a = (a + 0x9e3779b9) | 0;
  let t = a ^ (a >>> 16);
  t = Math.imul(t, 0x21f0aaad);
  t = t ^ (t >>> 15);
  t = Math.imul(t, 0x735a2d97);
  a = t ^ (t >>> 15);

  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministic Fisher-Yates shuffle
function shuffle<T>(array: T[], seed: number): T[] {
  const result = [...array];
  const random = mulberry32(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getCurrentPeriodIndex(): number {
  // Epoch: March 2, 2026 00:00:00 Lima time (UTC-5)
  // Which is March 2, 2026 05:00:00 UTC
  const epochMs = Date.UTC(2026, 2, 2, 5, 0, 0);
  const diffMs = Date.now() - epochMs;
  const periodDurationMs = 12 * 60 * 60 * 1000; // 12 hours
  return Math.floor(diffMs / periodDurationMs);
}

export function getThemeForPeriod(periodIndex: number): Theme {
  // Always premiere elephant directly on epoch's Period 0
  if (periodIndex === 0) return "elephant";

  const bagSize = THEMES.length;
  const currentBagIndex = Math.floor(periodIndex / bagSize);
  const indexWithinBag = periodIndex % bagSize;

  // Generate the current bag
  const currentBag = shuffle(THEMES, currentBagIndex);

  // Prevent consecutive repeats between bags
  if (currentBagIndex > 0) {
    const previousBag = shuffle(THEMES, currentBagIndex - 1);
    const lastThemeOfPreviousBag = previousBag[bagSize - 1];

    // If the first theme of the current bag is the same as the last theme of the previous bag,
    // swap it with the second theme of the current bag.
    if (currentBag[0] === lastThemeOfPreviousBag) {
      [currentBag[0], currentBag[1]] = [currentBag[1], currentBag[0]];
    }
  }

  return currentBag[indexWithinBag];
}

export function getCurrentTheme(): Theme {
  const currentPeriodIndex = getCurrentPeriodIndex();
  return getThemeForPeriod(currentPeriodIndex);
}
