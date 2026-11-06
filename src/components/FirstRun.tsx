import { useEffect, useMemo, useRef, useState } from "react";
import { regionBoundaries } from "@/domain/board";
import { useGameStore, type CellState } from "@/store/gameStore";
import { t } from "@/lib/i18n";
import { REGION_PALETTE_DARK, REGION_PALETTE_LIGHT } from "@/lib/designTokens";
import { playButton, playTap } from "@/lib/sound";

const SIZE = 5;

// The one example board: five regions, solved by SOLVED_QUEENS.
const REGIONS = [
  0, 0, 1, 1, 1,
  0, 1, 1, 2, 2,
  0, 3, 3, 2, 2,
  3, 3, 4, 4, 2,
  4, 4, 4, 4, 4,
];
const SOLVED_QUEENS = [0, 7, 14, 16, 23];
const LONE_QUEEN = 7;
const QUEEN_NEIGHBOURS = [1, 2, 3, 6, 8, 11, 12, 13];
const PRACTICE_CELL = 0;

/** The third tap brings the practice cell back round to empty. */
const TAPS_TO_FINISH_CYCLE = 3;

const STEPS = ["queen", "mark", "touch"] as const;

const boardFor = (step: number, practiceTaps: number): CellState[] => {
  const cells = new Array<CellState>(SIZE * SIZE).fill(0);

  if (STEPS[step] === "queen") {
    SOLVED_QUEENS.forEach((index) => (cells[index] = 2));
  }
  if (STEPS[step] === "mark") {
    cells[PRACTICE_CELL] = (practiceTaps % TAPS_TO_FINISH_CYCLE) as CellState;
  }
  if (STEPS[step] === "touch") {
    cells[LONE_QUEEN] = 2;
    QUEEN_NEIGHBOURS.forEach((index) => (cells[index] = 1));
  }
  return cells;
};

interface FirstRunProps {
  onSkip: () => void;
  onPlay: () => void;
}

/**
 * Teaches the rules by playing them on a small board, in three short steps.
 * Esc counts as skipping, which is always on offer anyway.
 */
export default function FirstRun({ onSkip, onPlay }: FirstRunProps) {
  const locale = useGameStore((state) => state.locale);
  const theme = useGameStore((state) => state.theme);
  const darkMode = useGameStore((state) => state.darkMode);
  const [step, setStep] = useState(0);
  const [practiceTaps, setPracticeTaps] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const boundaryPath = useMemo(
    () =>
      regionBoundaries(REGIONS, SIZE)
        .map(({ x1, y1, x2, y2 }) => `M${x1} ${y1}L${x2} ${y2}`)
        .join(""),
    [],
  );

  const name = STEPS[step];
  const cells = boardFor(step, practiceTaps);
  const palette = darkMode ? REGION_PALETTE_DARK : REGION_PALETTE_LIGHT;

  const tapPractice = () => {
    playTap();
    const taps = practiceTaps + 1;
    setPracticeTaps(taps);
    if (taps === TAPS_TO_FINISH_CYCLE) setStep(step + 1);
  };

  const advance = () => {
    playButton();
    if (name === "queen") setStep(step + 1);
    if (name === "mark") tapPractice();
    if (name === "touch") {
      dialogRef.current?.close("play");
    }
  };

  const handleClose = () => {
    if (dialogRef.current?.returnValue === "play") onPlay();
    else onSkip();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="first-run-title"
      onClose={handleClose}
      className="first-run bg-card text-ink rounded-[26px] p-5 shadow-[0_24px_40px_rgba(18,58,94,0.18)]"
    >
      <div
        className="flex justify-center gap-1.5 mb-3"
        role="img"
        aria-label={t(locale, "firstRun.stepAria", {
          step: step + 1,
          total: STEPS.length,
        })}
      >
        {STEPS.map((dot, index) => (
          <span
            key={dot}
            className={`w-1.5 h-1.5 rounded-full ${index === step ? "bg-accent" : "bg-icon-bg"}`}
          />
        ))}
      </div>

      <div className="first-run__board relative aspect-square rounded-[20px]">
        <div
          className="grid w-full h-full rounded-[20px] overflow-hidden"
          style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
        >
          {cells.map((cell, index) => {
            const practice = name === "mark" && index === PRACTICE_CELL;
            const Tag = practice ? "button" : "div";

            return (
              <Tag
                key={index}
                {...(practice
                  ? {
                      type: "button" as const,
                      onClick: tapPractice,
                      "aria-label": t(locale, "firstRun.practiceAria"),
                    }
                  : {})}
                className={`relative flex items-center justify-center aspect-square region-pattern-${REGIONS[index]} ${practice ? "cursor-pointer touch-manipulation z-20" : ""}`}
                style={{ backgroundColor: palette[REGIONS[index]] }}
              >
                {cell === 1 && (
                  <img
                    src="/assets/figures/x-mark.png"
                    alt=""
                    className="w-1/2 h-1/2 object-contain opacity-60 pointer-events-none"
                  />
                )}
                {cell === 2 && (
                  <img
                    src={`/assets/figures/${theme}.png`}
                    alt=""
                    className="w-[74%] h-[74%] object-contain drop-shadow-md pointer-events-none"
                  />
                )}
                {practice && (
                  <span className="absolute inset-0 rounded-lg border-[3px] border-accent pointer-events-none" />
                )}
              </Tag>
            );
          })}
        </div>
        <svg
          aria-hidden="true"
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          preserveAspectRatio="none"
        >
          <path
            d={boundaryPath}
            fill="none"
            stroke="var(--ink)"
            strokeOpacity={0.75}
            strokeWidth={3}
            strokeLinecap="square"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <h2
        id="first-run-title"
        className="font-display text-xl font-extrabold text-ink text-center mt-4"
      >
        {t(locale, `firstRun.${name}.title`)}
      </h2>
      <p className="text-muted text-sm text-center mt-1.5 mb-4" aria-live="polite">
        {t(locale, `firstRun.${name}.body`)}
      </p>

      <button
        type="button"
        autoFocus
        onClick={advance}
        className="w-full min-h-11 rounded-2xl bg-ink text-card text-sm font-extrabold hover:brightness-110 transition-all active:scale-[0.97]"
      >
        {t(locale, `firstRun.${name}.cta`)}
      </button>
      <form method="dialog" className="mt-1 text-center">
        <button
          value="skip"
          className="min-h-11 px-4 text-muted text-sm font-bold hover:underline"
        >
          {t(locale, "firstRun.skip")}
        </button>
      </form>
    </dialog>
  );
}
