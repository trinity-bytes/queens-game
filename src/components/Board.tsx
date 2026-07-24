import { useGameStore } from "@/store/gameStore";
import Cell from "./Cell";
import { useEffect } from "react";
import { t } from "@/lib/i18n";

export default function Board() {
  const { gridSize, regions, cells, status, generatePuzzle, locale } =
    useGameStore();

  useEffect(() => {
    if (status === "idle") {
      generatePuzzle();
    }
  }, [status, generatePuzzle]);

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
                regions={regions}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
