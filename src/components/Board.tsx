import { useGameStore } from "@/store/gameStore";
import Cell from "./Cell";
import { useEffect, useMemo } from "react";
import { t } from "@/lib/i18n";
import { regionBoundaries } from "@/domain/board";
import { useConflicts } from "@/lib/useConflicts";

export default function Board() {
  const gridSize = useGameStore((state) => state.gridSize);
  const regions = useGameStore((state) => state.regions);
  const cells = useGameStore((state) => state.cells);
  const status = useGameStore((state) => state.status);
  const generatePuzzle = useGameStore((state) => state.generatePuzzle);
  const startGame = useGameStore((state) => state.startGame);
  const locale = useGameStore((state) => state.locale);

  const { queens: conflicting } = useConflicts();

  // One path, so the lines stay even where they meet: overlapping strokes at
  // 75% opacity would darken every junction.
  const boundaryPath = useMemo(
    () =>
      regionBoundaries(regions, gridSize)
        .map(({ x1, y1, x2, y2 }) => `M${x1} ${y1}L${x2} ${y2}`)
        .join(""),
    [regions, gridSize],
  );

  useEffect(() => {
    if (status === "idle") {
      startGame();
    }
  }, [status, startGame]);

  if (status === "error") {
    return (
      <div
        className="board-frame bg-card rounded-[28px] flex items-center justify-center shadow-[0_14px_30px_rgba(18,58,94,0.18)] p-6"
        role="alert"
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-xl font-extrabold">
            {t(locale, "board.errorTitle")}
          </p>
          <p className="text-muted font-semibold text-sm max-w-xs">
            {t(locale, "board.errorText")}
          </p>
          <button
            type="button"
            onClick={generatePuzzle}
            className="px-5 py-2.5 bg-accent text-white rounded-2xl font-extrabold hover:brightness-95 transition-all active:scale-95"
          >
            {t(locale, "board.errorRetry")}
          </button>
        </div>
      </div>
    );
  }

  if (status === "generating") {
    return (
      <div
        className="board-frame bg-card rounded-[28px] flex items-center justify-center shadow-[0_14px_30px_rgba(18,58,94,0.18)]"
        role="status"
        aria-live="polite"
        aria-label={t(locale, "board.generatingLabel")}
      >
        <div className="flex flex-col items-center gap-5">
          <div className="flex gap-2" aria-hidden="true">
            <span className="w-2.5 h-2.5 rounded-full bg-accent dot-bounce" />
            <span className="w-2.5 h-2.5 rounded-full bg-accent opacity-60 dot-bounce [animation-delay:0.15s]" />
            <span className="w-2.5 h-2.5 rounded-full bg-accent opacity-30 dot-bounce [animation-delay:0.3s]" />
          </div>
          <p className="text-muted font-semibold animate-pulse">
            {t(locale, "board.generatingText")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="board-frame relative bg-card rounded-[28px] shadow-[0_14px_30px_rgba(18,58,94,0.18)]">
      <div
        role="grid"
        aria-label={t(locale, "board.gridAria", { size: gridSize })}
        className="w-full h-full"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: gridSize }, (_, rowIdx) => (
          <div key={rowIdx} role="row" style={{ display: "contents" }}>
            {Array.from({ length: gridSize }, (_, colIdx) => {
              const index = rowIdx * gridSize + colIdx;
              return (
                <Cell
                  key={index}
                  index={index}
                  regionId={regions[index]}
                  state={cells[index]}
                  gridSize={gridSize}
                  isConflicting={conflicting.has(index)}
                />
              );
            })}
          </div>
        ))}
      </div>
      <svg
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        viewBox={`0 0 ${gridSize} ${gridSize}`}
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
  );
}
