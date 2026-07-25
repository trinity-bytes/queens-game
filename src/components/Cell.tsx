import { useGameStore } from "@/store/gameStore";
import { useCallback, useEffect, useRef } from "react";
import { getRegionName, t } from "@/lib/i18n";
import { playTap } from "@/lib/sound";
import {
  REGION_PALETTE_LIGHT,
  REGION_PALETTE_DARK,
  CELL_EDGE_LIGHT,
  CELL_EDGE_DARK,
  CELL_CONFLICT_LIGHT,
  CELL_CONFLICT_DARK,
} from "@/lib/designTokens";

interface CellProps {
  index: number;
  regionId: number;
  state: 0 | 1 | 2;
  gridSize: number;
  /** True when this queen breaks a rule against another queen on the board. */
  isConflicting: boolean;
}

export default function Cell({
  index,
  regionId,
  state,
  gridSize,
  isConflicting,
}: CellProps) {
  const { toggleCell, theme, incrementXPenalty, locale, darkMode } =
    useGameStore();
  const xTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (state === 1) {
      // Start 2-second timer when cell becomes 'X'
      xTimeoutRef.current = setTimeout(() => {
        incrementXPenalty();
      }, 2000);
    } else {
      // Clear timer if state changes before 2 seconds
      if (xTimeoutRef.current) {
        clearTimeout(xTimeoutRef.current);
        xTimeoutRef.current = null;
      }
    }

    return () => {
      if (xTimeoutRef.current) {
        clearTimeout(xTimeoutRef.current);
      }
    };
  }, [state, incrementXPenalty]);

  const row = Math.floor(index / gridSize);
  const col = index % gridSize;

  const palette = darkMode ? REGION_PALETTE_DARK : REGION_PALETTE_LIGHT;
  const conflict = darkMode ? CELL_CONFLICT_DARK : CELL_CONFLICT_LIGHT;
  const edge = darkMode ? CELL_EDGE_DARK : CELL_EDGE_LIGHT;
  const bgColor = isConflicting ? conflict : palette[regionId % palette.length];
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

  return (
    <button
      type="button"
      data-cell-index={index}
      aria-label={ariaLabel}
      aria-pressed={state === 2}
      tabIndex={index === 0 ? 0 : -1}
      className={`w-full aspect-square flex items-center justify-center cursor-pointer select-none transition-colors duration-200 hover:brightness-95 active:scale-90 ${patternClass}`}
      style={{
        backgroundColor: bgColor,
        border: `1px solid ${edge}`,
      }}
      onPointerDown={(e) => {
        e.preventDefault();
        playTap();
        toggleCell(index);
      }}
      onKeyDown={handleKeyDown}
    >
      {icon}
    </button>
  );
}
