import { useGameStore } from "@/store/gameStore";
import Cell from "./Cell";
import { useEffect } from "react";

export default function Board() {
  const { gridSize, regions, cells, status, generatePuzzle } = useGameStore();

  useEffect(() => {
    if (status === "idle") {
      generatePuzzle();
    }
  }, [status, generatePuzzle]);

  if (status === "generating") {
    return (
      <div
        className="w-full max-w-md aspect-square bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-inner"
        role="status"
        aria-live="polite"
        aria-label="Generando puzzle"
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 border-4 border-sky-200 dark:border-slate-600 border-t-sky-600 dark:border-t-sky-400 rounded-full animate-spin"
            aria-hidden="true"
          ></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">
            Generando puzzle único...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      role="grid"
      aria-label={`Tablero de juego de ${gridSize} por ${gridSize}`}
      className="w-full max-w-md aspect-square bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden border-4 border-slate-800 dark:border-slate-600"
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
