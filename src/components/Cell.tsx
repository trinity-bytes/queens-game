import { useGameStore } from "@/store/gameStore";
import { useCallback, useEffect, useRef } from "react";
import { getRegionName, t } from "@/lib/i18n";

interface CellProps {
  index: number;
  regionId: number;
  state: 0 | 1 | 2;
  gridSize: number;
  regions: number[];
}

const REGION_COLORS = [
  "bg-sky-100 dark:bg-sky-900",
  "bg-blue-200 dark:bg-blue-900",
  "bg-indigo-100 dark:bg-indigo-900",
  "bg-cyan-200 dark:bg-cyan-900",
  "bg-teal-100 dark:bg-teal-900",
  "bg-emerald-200 dark:bg-emerald-900",
  "bg-green-100 dark:bg-green-900",
  "bg-lime-200 dark:bg-lime-900",
  "bg-yellow-100 dark:bg-yellow-900",
  "bg-amber-200 dark:bg-amber-900",
  "bg-orange-100 dark:bg-orange-900",
  "bg-red-200 dark:bg-red-900",
  "bg-rose-200 dark:bg-rose-900",
  "bg-violet-100 dark:bg-violet-900",
  "bg-fuchsia-200 dark:bg-fuchsia-900",
];

export default function Cell({
  index,
  regionId,
  state,
  gridSize,
  regions,
}: CellProps) {
  const { toggleCell, theme, incrementXPenalty, locale } = useGameStore();
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

  // Calculate borders based on adjacent regions
  const topBorder =
    row === 0 || regions[(row - 1) * gridSize + col] !== regionId;
  const bottomBorder =
    row === gridSize - 1 || regions[(row + 1) * gridSize + col] !== regionId;
  const leftBorder =
    col === 0 || regions[row * gridSize + (col - 1)] !== regionId;
  const rightBorder =
    col === gridSize - 1 || regions[row * gridSize + (col + 1)] !== regionId;

  const borderClasses = `
    ${topBorder ? "border-t-2 border-t-slate-800 dark:border-t-slate-600" : "border-t border-t-transparent"}
    ${bottomBorder ? "border-b-2 border-b-slate-800 dark:border-b-slate-600" : "border-b border-b-transparent"}
    ${leftBorder ? "border-l-2 border-l-slate-800 dark:border-l-slate-600" : "border-l border-l-transparent"}
    ${rightBorder ? "border-r-2 border-r-slate-800 dark:border-r-slate-600" : "border-r border-r-transparent"}
  `;

  const bgColor = REGION_COLORS[regionId % REGION_COLORS.length];
  const patternClass = `region-pattern-${regionId % 15}`;
  const regionName = getRegionName(locale, regionId);

  const getIcon = () => {
    if (state === 0) return null;
    if (state === 1)
      return (
        <img
          src="/assets/figures/x-mark.png"
          alt="X"
          className="w-3/4 h-3/4 object-contain opacity-70"
        />
      );

    const figureSrc = `/assets/figures/${theme}.png`;
    return (
      <img
        src={figureSrc}
        alt="Queen"
        className="w-3/4 h-3/4 object-contain drop-shadow-md"
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
      className={`
        w-full aspect-square flex items-center justify-center text-2xl cursor-pointer select-none
        transition-colors duration-200
        ${bgColor} ${patternClass} ${borderClasses}
        hover:brightness-95 active:scale-95
      `}
      onPointerDown={(e) => {
        e.preventDefault();
        toggleCell(index);
      }}
      onKeyDown={handleKeyDown}
    >
      {icon}
    </button>
  );
}
