import { useGameStore } from "@/store/gameStore";
import { useCallback } from "react";

interface CellProps {
  index: number;
  regionId: number;
  state: 0 | 2;
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

const REGION_NAMES = [
  "cielo",
  "azul",
  "índigo",
  "cian",
  "verde azulado",
  "esmeralda",
  "verde",
  "lima",
  "amarillo",
  "ámbar",
  "naranja",
  "rojo",
  "rosa",
  "violeta",
  "fucsia",
];

export default function Cell({
  index,
  regionId,
  state,
  gridSize,
  regions,
}: CellProps) {
  const { toggleCell, theme } = useGameStore();

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
  const regionName = REGION_NAMES[regionId % REGION_NAMES.length];

  const getIcon = () => {
    if (state === 0) return null;

    switch (theme) {
      case "dino":
        return "🦕";
      case "dog":
        return "🐶";
      case "cow":
        return "🐮";
      case "potato":
        return "🥔";
      case "starwars":
        return "👽";
      default:
        return "👑";
    }
  };

  const stateLabel = state === 2 ? "con reina" : "vacía";
  const ariaLabel = `Fila ${row + 1}, Columna ${col + 1}, región ${regionName}, ${stateLabel}`;

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
      {icon && <span aria-hidden="true">{icon}</span>}
    </button>
  );
}
