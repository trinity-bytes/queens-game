import { useMemo } from "react";
import { findConflicts } from "@/domain/board";
import { useGameStore } from "@/store/gameStore";

export function useConflicts() {
  const cells = useGameStore((state) => state.cells);
  const regions = useGameStore((state) => state.regions);
  const gridSize = useGameStore((state) => state.gridSize);

  return useMemo(
    () => findConflicts(cells, regions, gridSize),
    [cells, regions, gridSize],
  );
}
