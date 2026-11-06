import { useGameStore } from "@/store/gameStore";
import { useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import HamburgerMenu from "./HamburgerMenu";
import { t } from "@/lib/i18n";
import { playButton } from "@/lib/sound";
import { useHydrated } from "@/lib/useHydrated";

/**
 * Game header. Deliberately shows the elapsed time only: score, combo and
 * penalties stay hidden until the victory modal, because a live score would
 * tell the player whether the queen they just placed is correct.
 */
export default function Header() {
  const timer = useGameStore((state) => state.timer);
  const status = useGameStore((state) => state.status);
  const theme = useGameStore((state) => state.theme);
  const darkMode = useGameStore((state) => state.darkMode);
  const toggleDarkMode = useGameStore((state) => state.toggleDarkMode);
  const locale = useGameStore((state) => state.locale);
  // The dark-mode override comes from localStorage, so the toggle renders in
  // its light state until hydration catches up.
  const mounted = useHydrated();

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

  return (
    <header className="game-header relative z-40 flex items-center justify-between gap-2 w-full p-2.5 bg-card rounded-3xl shadow-[0_6px_18px_rgba(18,58,94,0.10)] transition-colors duration-300">
      <div className="flex items-center gap-2 min-w-0">
        <HamburgerMenu inHeader={true} />
        <span
          aria-hidden="true"
          className="w-9 h-9 flex-shrink-0 rounded-xl bg-icon-bg flex items-center justify-center"
        >
          <img
            suppressHydrationWarning
            src={`/assets/figures/${theme}.png`}
            alt="Theme Icon"
            className="w-6 h-6 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/assets/figures/queen.png";
            }}
          />
        </span>
        {/* Kept in the accessibility tree on very narrow screens, where there
            is no room to render it next to the timer and the actions. */}
        <h1 className="font-display font-extrabold text-ink text-xl truncate sr-only min-[360px]:not-sr-only">
          Queens
        </h1>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* TIME chip */}
        <div
          className="flex flex-col items-center bg-chip-bg rounded-xl px-2.5 py-1"
          role="timer"
          aria-label={t(locale, "header.timer", { time: formatTime(timer) })}
          aria-live="off"
        >
          <span className="text-micro font-extrabold tracking-wider text-chip-label">
            {t(locale, "header.timeLabel")}
          </span>
          <span className="font-extrabold text-sm text-ink tabular-nums">
            {formatTime(timer)}
          </span>
        </div>

        <button
          onClick={() => {
            playButton();
            toggleDarkMode();
          }}
          className="w-11 h-11 rounded-xl bg-icon-bg hover:brightness-95 text-ink flex items-center justify-center transition-all active:scale-90"
          aria-label={
            mounted && darkMode
              ? t(locale, "header.light")
              : t(locale, "header.dark")
          }
          title={
            mounted && darkMode
              ? t(locale, "header.lightTitle")
              : t(locale, "header.darkTitle")
          }
        >
          {mounted && darkMode ? (
            <Moon className="w-4 h-4" />
          ) : (
            <Sun className="w-4 h-4" />
          )}
        </button>

      </div>
    </header>
  );
}
