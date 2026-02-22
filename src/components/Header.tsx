import { useGameStore } from "@/store/gameStore";
import { useEffect } from "react";
import { Play } from "lucide-react";

export default function Header() {
  const { timer, status, theme, generatePuzzle } = useGameStore();

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
        <span className="text-2xl" aria-hidden="true">
          {getThemeIcon()}
        </span>
        <h1 className="font-bold text-slate-700 text-lg">Queens</h1>
      </div>

      <div className="flex items-center gap-4">
        <div
          role="timer"
          aria-label={`Tiempo transcurrido: ${formatTime(timer)}`}
          aria-live="off"
          className="font-mono text-xl font-semibold text-sky-600"
        >
          {formatTime(timer)}
        </div>

        <button
          onClick={generatePuzzle}
          className="p-2 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-600 transition-colors"
          aria-label="Nuevo puzzle"
          title="Nuevo puzzle"
        >
          <Play size={20} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
