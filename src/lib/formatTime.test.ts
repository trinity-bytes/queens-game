import { describe, expect, it } from "vitest";
import { formatTime } from "./formatTime";

describe("formatTime", () => {
  it.each([
    [0, "00:00"],
    [59_999, "00:59"],
    [95_000, "01:35"],
    [3_600_000, "60:00"],
  ])("shows %i ms as %s", (ms, expected) => {
    expect(formatTime(ms)).toBe(expected);
  });
});
