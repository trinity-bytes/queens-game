import { useGameStore } from "@/store/gameStore";
import { useEffect } from "react";
import { Play, RotateCcw, Trophy } from "lucide-react";

export default function Header() {
  const { timer, status, theme, generatePuzzle, resetBoard } = useGameStore();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === "playing") {
      interval = setInterval(() => {
        useGameStore.getState().tickTimer();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const getThemeIcon = () => {
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
    <header className="flex items-center justify-between w-full max-w-md p-4 bg-white rounded-xl shadow-sm mb-6">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{getThemeIcon()}</span>
        <span className="font-bold text-slate-700 text-lg">Queens</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="font-mono text-xl font-semibold text-sky-600">
          {formatTime(timer)}
        </div>

        <div className="flex gap-2">
          <button
            onClick={resetBoard}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            title="Reiniciar tablero"
          >
            <RotateCcw size={20} />
          </button>
          <button
            onClick={generatePuzzle}
            className="p-2 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-600 transition-colors"
            title="Nuevo puzzle"
          >
            <Play size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
