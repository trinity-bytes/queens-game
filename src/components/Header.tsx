import { useGameStore } from "@/store/gameStore";
import { useEffect, useState } from "react";

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
    const figureSrc = `/assets/figures/${theme}.png`;
    return (
      <img
        src={figureSrc}
        alt="Theme Icon"
        className="w-8 h-8 object-contain"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "/assets/figures/queen.png";
        }}
      />
    );
  };

  return (
    <header className="flex items-center justify-between w-full max-w-md p-4 bg-theme-surface rounded-xl shadow-sm mb-6 transition-colors duration-300">
      <div className="flex items-center gap-2">
        <span aria-hidden="true">{getThemeIcon()}</span>
        <h1 className="font-bold text-theme-text text-lg">Queens</h1>
      </div>

      <div className="flex items-center gap-4">
        <div
          role="timer"
          aria-label={`Tiempo transcurrido: ${formatTime(timer)}`}
          aria-live="off"
          className="font-mono text-xl font-semibold text-theme-text"
        >
          {formatTime(timer)}
        </div>

        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-full bg-theme-accent hover:brightness-95 text-theme-text transition-all"
          aria-label={
            mounted && darkMode
              ? "Cambiar a tema claro"
              : "Cambiar a tema oscuro"
          }
          title={mounted && darkMode ? "Tema claro" : "Tema oscuro"}
        >
          {mounted && darkMode ? (
            <div
              className="w-5 h-5 bg-theme-text"
              style={{
                maskImage: "url(/assets/icons/sun.png)",
                WebkitMaskImage: "url(/assets/icons/sun.png)",
                maskSize: "contain",
                WebkitMaskSize: "contain",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
                maskPosition: "center",
                WebkitMaskPosition: "center",
              }}
              aria-label="Sun"
            />
          ) : (
            <div
              className="w-5 h-5 bg-theme-text"
              style={{
                maskImage: "url(/assets/icons/moon.png)",
                WebkitMaskImage: "url(/assets/icons/moon.png)",
                maskSize: "contain",
                WebkitMaskSize: "contain",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
                maskPosition: "center",
                WebkitMaskPosition: "center",
              }}
              aria-label="Moon"
            />
          )}
        </button>

        <button
          onClick={generatePuzzle}
          className="p-2 rounded-full bg-theme-accent hover:brightness-95 text-theme-text transition-all"
          aria-label="Nuevo puzzle"
          title="Nuevo puzzle"
        >
          <div
            className="w-5 h-5 bg-theme-text"
            style={{
              maskImage: "url(/assets/icons/play-button.png)",
              WebkitMaskImage: "url(/assets/icons/play-button.png)",
              maskSize: "contain",
              WebkitMaskSize: "contain",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskPosition: "center",
              WebkitMaskPosition: "center",
            }}
            aria-label="Play"
          />
        </button>
      </div>
    </header>
  );
}
