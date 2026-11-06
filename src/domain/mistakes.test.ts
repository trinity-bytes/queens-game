import { describe, expect, it } from "vitest";
import { NO_MISTAKES, settleMove, type MistakeTally } from "./mistakes";

const WRONG = { correct: false };
const RIGHT = { correct: true };

/** Plays moves in order, as [cell, queen placed by the move or null]. */
const play = (moves: [number, { correct: boolean } | null][]): MistakeTally =>
  moves.reduce<MistakeTally>(
    (tally, [cell, placed]) => settleMove(tally, cell, placed).tally,
    NO_MISTAKES,
  );

describe("settleMove", () => {
  it("does not count a wrong queen until the player acts on another cell", () => {
    expect(play([[4, WRONG]]).mistakes).toBe(0);
  });

  it("counts a wrong queen still there when the player acts on another cell", () => {
    expect(
      play([
        [4, WRONG],
        [7, null],
      ]).mistakes,
    ).toBe(1);
  });

  it("charges nothing for passing a cell through queen on to empty", () => {
    const { tally, passedThrough } = settleMove(
      play([
        [4, null],
        [4, WRONG],
      ]),
      4,
      null,
    );

    expect(tally.mistakes).toBe(0);
    expect(tally.pending).toBeNull();
    expect(passedThrough).toBe(true);
  });

  it("clears three marks for free", () => {
    const clearing = [1, 2, 3].flatMap((cell): [number, typeof WRONG | null][] => [
      [cell, WRONG],
      [cell, null],
    ]);

    expect(play(clearing).mistakes).toBe(0);
  });

  it("never counts a correct queen", () => {
    expect(
      play([
        [4, RIGHT],
        [7, null],
      ]).mistakes,
    ).toBe(0);
  });

  it("counts the same wrong queen once, however long it stands", () => {
    expect(
      play([
        [4, WRONG],
        [7, null],
        [8, null],
        [9, null],
      ]).mistakes,
    ).toBe(1);
  });

  it("counts a wrong queen again when it is placed again later", () => {
    expect(
      play([
        [4, WRONG],
        [7, null],
        [4, null],
        [4, null],
        [4, WRONG],
        [7, null],
      ]).mistakes,
    ).toBe(2);
  });

  it("settles the previous queen when the next move places another", () => {
    const tally = play([
      [4, WRONG],
      [7, WRONG],
    ]);

    expect(tally.mistakes).toBe(1);
    expect(tally.pending).toEqual({ index: 7, correct: false });
  });

  it("reports no pass-through when the queen stays", () => {
    expect(settleMove(play([[4, WRONG]]), 7, null).passedThrough).toBe(false);
  });
});
