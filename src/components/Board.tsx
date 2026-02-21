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
      <div className="w-full max-w-md aspect-square bg-slate-100 rounded-xl flex items-center justify-center shadow-inner">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">
            Generando puzzle único...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-md aspect-square bg-white rounded-xl shadow-lg overflow-hidden border-4 border-slate-800"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
      }}
    >
      {cells.map((state, index) => (
        <Cell
          key={index}
          index={index}
          regionId={regions[index]}
          state={state}
          gridSize={gridSize}
          regions={regions}
        />
      ))}
    </div>
  );
}
