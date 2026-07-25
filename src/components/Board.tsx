import { useGameStore } from "@/store/gameStore";
import Cell from "./Cell";
import { useEffect, useMemo } from "react";
import { t } from "@/lib/i18n";

/**
 * Returns the indices of every queen that breaks a rule against another queen
 * already on the board: same row, same column, same region, or touching.
 *
 * This is derived purely from what the player can see, never from the stored
 * solution. Highlighting "wrong" queens by comparing them to the solution would
 * turn the board into an oracle and let the puzzle be brute-forced.
 */
function getConflictingQueens(
  cells: number[],
  regions: number[],
  gridSize: number,
): Set<number> {
  const queens: number[] = [];
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] === 2) queens.push(i);
  }

  const conflicting = new Set<number>();
  for (let a = 0; a < queens.length; a++) {
    for (let b = a + 1; b < queens.length; b++) {
      const first = queens[a];
      const second = queens[b];
      const firstRow = Math.floor(first / gridSize);
      const firstCol = first % gridSize;
      const secondRow = Math.floor(second / gridSize);
      const secondCol = second % gridSize;

      const sameLine = firstRow === secondRow || firstCol === secondCol;
      const sameRegion = regions[first] === regions[second];
      const touching =
        Math.abs(firstRow - secondRow) <= 1 &&
        Math.abs(firstCol - secondCol) <= 1;

      if (sameLine || sameRegion || touching) {
        conflicting.add(first);
        conflicting.add(second);
      }
    }
  }
  return conflicting;
}

export default function Board() {
  const gridSize = useGameStore((state) => state.gridSize);
  const regions = useGameStore((state) => state.regions);
  const cells = useGameStore((state) => state.cells);
  const status = useGameStore((state) => state.status);
  const generatePuzzle = useGameStore((state) => state.generatePuzzle);
  const locale = useGameStore((state) => state.locale);

  const conflicting = useMemo(
    () => getConflictingQueens(cells, regions, gridSize),
    [cells, regions, gridSize],
  );

  useEffect(() => {
    if (status === "idle") {
      generatePuzzle();
    }
  }, [status, generatePuzzle]);

  if (status === "error") {
    return (
      <div
        className="w-full max-w-md aspect-square bg-card rounded-[28px] flex items-center justify-center shadow-[0_14px_30px_rgba(18,58,94,0.18)] p-6"
        role="alert"
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-extrabold">
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
        className="w-full max-w-md aspect-square bg-card rounded-[28px] flex items-center justify-center shadow-[0_14px_30px_rgba(18,58,94,0.18)]"
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
    <div
      role="grid"
      aria-label={t(locale, "board.gridAria", { size: gridSize })}
      className="w-full max-w-md aspect-square bg-card rounded-[28px] shadow-[0_14px_30px_rgba(18,58,94,0.18)] overflow-hidden"
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
  );
}
