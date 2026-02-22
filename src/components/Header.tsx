import { useGameStore } from "@/store/gameStore";
import { useEffect, useState } from "react";
import { Play, Moon, Sun } from "lucide-react";

export default function Header() {
  const { timer, status, theme, darkMode, generatePuzzle, toggleDarkMode } =
    useGameStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    <header className="flex items-center justify-between w-full max-w-md p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm mb-6">
      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden="true">
          {getThemeIcon()}
        </span>
        <h1 className="font-bold text-slate-700 dark:text-slate-200 text-lg">
          Queens
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <div
          role="timer"
          aria-label={`Tiempo transcurrido: ${formatTime(timer)}`}
          aria-live="off"
          className="font-mono text-xl font-semibold text-sky-600 dark:text-sky-400"
        >
          {formatTime(timer)}
        </div>

        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-full bg-sky-100 dark:bg-slate-700 hover:bg-sky-200 dark:hover:bg-slate-600 text-sky-600 dark:text-sky-400 transition-colors"
          aria-label={
            mounted && darkMode
              ? "Cambiar a tema claro"
              : "Cambiar a tema oscuro"
          }
          title={mounted && darkMode ? "Tema claro" : "Tema oscuro"}
        >
          {mounted && darkMode ? (
            <Sun size={20} aria-hidden="true" />
          ) : (
            <Moon size={20} aria-hidden="true" />
          )}
        </button>

        <button
          onClick={generatePuzzle}
          className="p-2 rounded-full bg-sky-100 dark:bg-slate-700 hover:bg-sky-200 dark:hover:bg-slate-600 text-sky-600 dark:text-sky-400 transition-colors"
          aria-label="Nuevo puzzle"
          title="Nuevo puzzle"
        >
          <Play size={20} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
