import { Theme } from "@/store/gameStore";

const THEMES: Theme[] = ["dino", "dog", "cow", "potato", "starwars"];

// Seeded random number generator (Mulberry32)
function mulberry32(a: number) {
  return function () {
    var t = (a += 0x6d2b79f5);
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

export function getCurrentTheme(): Theme {
  // 1. Get current time in Lima (GMT-5)
  const now = new Date();
  const limaTime = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Lima" }),
  );

  // 2. Calculate the number of 12-hour periods since a fixed epoch
  // Let's use Jan 1, 2024 00:00:00 Lima time as epoch
  const epoch = new Date("2024-01-01T00:00:00-05:00");
  const diffMs = limaTime.getTime() - epoch.getTime();
  const periodDurationMs = 12 * 60 * 60 * 1000; // 12 hours
  const currentPeriodIndex = Math.floor(diffMs / periodDurationMs);

  // 3. Determine which "bag" we are in and the index within that bag
  const bagSize = THEMES.length;
  const currentBagIndex = Math.floor(currentPeriodIndex / bagSize);
  const indexWithinBag = currentPeriodIndex % bagSize;

  // 4. Generate the current bag
  let currentBag = shuffle(THEMES, currentBagIndex);

  // 5. Prevent consecutive repeats between bags
  if (currentBagIndex > 0) {
    const previousBag = shuffle(THEMES, currentBagIndex - 1);
    const lastThemeOfPreviousBag = previousBag[bagSize - 1];

    // If the first theme of the current bag is the same as the last theme of the previous bag,
    // swap it with the second theme of the current bag.
    if (currentBag[0] === lastThemeOfPreviousBag) {
      [currentBag[0], currentBag[1]] = [currentBag[1], currentBag[0]];
    }
  }

  // 6. Return the theme for the current period
  return currentBag[indexWithinBag];
}
