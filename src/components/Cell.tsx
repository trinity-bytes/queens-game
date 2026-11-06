import { useGameStore } from "@/store/gameStore";
import { memo, useCallback } from "react";
import { getRegionName, t } from "@/lib/i18n";
import { playTap } from "@/lib/sound";
import {
  REGION_PALETTE_LIGHT,
  REGION_PALETTE_DARK,
  CELL_EDGE_LIGHT,
  CELL_EDGE_DARK,
} from "@/lib/designTokens";

interface CellProps {
  index: number;
  regionId: number;
  state: 0 | 1 | 2;
  gridSize: number;
  /** True when this queen breaks a rule against another queen on the board. */
  isConflicting: boolean;
}

function Cell({ index, regionId, state, gridSize, isConflicting }: CellProps) {
  // One subscription per value. Reading the whole store here would re-render
  // all 81 cells on every timer tick, since tickTimer writes to the store once
  // a second whether or not anything on the board changed.
  // `store` rather than the usual `state`, which is already a prop here.
  const toggleCell = useGameStore((store) => store.toggleCell);
  const theme = useGameStore((store) => store.theme);
  const locale = useGameStore((store) => store.locale);
  const darkMode = useGameStore((store) => store.darkMode);

  const row = Math.floor(index / gridSize);
  const col = index % gridSize;

  const palette = darkMode ? REGION_PALETTE_DARK : REGION_PALETTE_LIGHT;
  const edge = darkMode ? CELL_EDGE_DARK : CELL_EDGE_LIGHT;
  const bgColor = palette[regionId % palette.length];
  const patternClass = `region-pattern-${regionId % 15}`;
  const regionName = getRegionName(locale, regionId);

  const getIcon = () => {
    if (state === 0) return null;
    if (state === 1)
      return (
        <img
          src="/assets/figures/x-mark.png"
          alt="X"
          className="w-1/2 h-1/2 object-contain opacity-60 pointer-events-none"
          style={darkMode ? { filter: "invert(1)" } : undefined}
        />
      );

    const figureSrc = `/assets/figures/${theme}.png`;
    return (
      <img
        src={figureSrc}
        alt="Queen"
        className="w-[74%] h-[74%] object-contain drop-shadow-md animate-qpop pointer-events-none"
        onError={(e) => {
          // Fallback to default queen if theme image is missing
          (e.target as HTMLImageElement).src = "/assets/figures/queen.png";
        }}
      />
    );
  };

  const stateLabel =
    state === 2
      ? t(locale, "cell.stateQueen")
      : state === 1
        ? t(locale, "cell.stateX")
        : t(locale, "cell.stateEmpty");
  const ariaLabel = t(locale, "cell.aria", {
    row: row + 1,
    col: col + 1,
    region: regionName,
    state: stateLabel,
  });

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        playTap();
        toggleCell(index);
        return;
      }

      // Arrow key navigation within the grid
      let targetIndex = -1;
      switch (e.key) {
        case "ArrowUp":
          if (row > 0) targetIndex = (row - 1) * gridSize + col;
          break;
        case "ArrowDown":
          if (row < gridSize - 1) targetIndex = (row + 1) * gridSize + col;
          break;
        case "ArrowLeft":
          if (col > 0) targetIndex = row * gridSize + (col - 1);
          break;
        case "ArrowRight":
          if (col < gridSize - 1) targetIndex = row * gridSize + (col + 1);
          break;
        case "Home":
          targetIndex = row * gridSize;
          break;
        case "End":
          targetIndex = row * gridSize + (gridSize - 1);
          break;
      }

      if (targetIndex >= 0) {
        e.preventDefault();
        const targetEl = document.querySelector(
          `[data-cell-index="${targetIndex}"]`,
        ) as HTMLElement;
        targetEl?.focus();
      }
    },
    [index, row, col, gridSize, toggleCell],
  );

  const icon = getIcon();

  // The grid cannot clip its corners: it would also clip the focus ring and the
  // conflict badge of every cell along the edge.
  const last = gridSize - 1;
  const cornerClass =
    row === 0 && col === 0
      ? "rounded-tl-[28px]"
      : row === 0 && col === last
        ? "rounded-tr-[28px]"
        : row === last && col === 0
          ? "rounded-bl-[28px]"
          : row === last && col === last
            ? "rounded-br-[28px]"
            : "";

  return (
    <button
      type="button"
      data-cell-index={index}
      aria-label={ariaLabel}
      aria-pressed={state === 2}
      tabIndex={index === 0 ? 0 : -1}
      className={`relative w-full aspect-square flex items-center justify-center cursor-pointer select-none touch-manipulation transition-colors duration-200 hover:brightness-95 active:scale-90 focus-visible:z-30 ${isConflicting ? "z-20" : ""} ${cornerClass} ${patternClass}`}
      style={{
        backgroundColor: bgColor,
        border: `1px solid ${edge}`,
      }}
      onClick={() => {
        playTap();
        toggleCell(index);
      }}
      onKeyDown={handleKeyDown}
    >
      {icon}
      {isConflicting && (
        <span aria-hidden="true">
          <span className="absolute inset-0 rounded-lg border-[3px] border-badge-errors pointer-events-none" />
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-badge-errors text-card text-micro font-extrabold flex items-center justify-center pointer-events-none">
            !
          </span>
        </span>
      )}
    </button>
  );
}

/**
 * Memoised because Board re-renders the whole grid whenever any cell changes,
 * and every prop here is a primitive. Only the cells whose own state or
 * conflict status actually moved need to re-render.
 */
export default memo(Cell);
