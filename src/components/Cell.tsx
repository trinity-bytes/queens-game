import { useGameStore } from "@/store/gameStore";

interface CellProps {
  index: number;
  regionId: number;
  state: 0 | 2;
  gridSize: number;
  regions: number[];
}

const REGION_COLORS = [
  "bg-sky-100",
  "bg-blue-200",
  "bg-indigo-100",
  "bg-cyan-200",
  "bg-teal-100",
  "bg-emerald-200",
  "bg-green-100",
  "bg-lime-200",
  "bg-yellow-100",
  "bg-amber-200",
  "bg-orange-100",
  "bg-red-200",
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
    ${topBorder ? "border-t-2 border-t-slate-800" : "border-t border-t-transparent"}
    ${bottomBorder ? "border-b-2 border-b-slate-800" : "border-b border-b-transparent"}
    ${leftBorder ? "border-l-2 border-l-slate-800" : "border-l border-l-transparent"}
    ${rightBorder ? "border-r-2 border-r-slate-800" : "border-r border-r-transparent"}
  `;

  const bgColor = REGION_COLORS[regionId % REGION_COLORS.length];

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

  return (
    <div
      className={`
        w-full aspect-square flex items-center justify-center text-2xl cursor-pointer select-none
        transition-colors duration-200
        ${bgColor} ${borderClasses}
        hover:brightness-95 active:scale-95
      `}
      onPointerDown={(e) => {
        e.preventDefault(); // Prevent default touch behavior like scrolling
        toggleCell(index);
      }}
    >
      {getIcon()}
    </div>
  );
}
