import { useGameStore } from "@/store/gameStore";
import { useEffect, useRef, useState } from "react";
import { Sun, Moon } from "lucide-react";
import HamburgerMenu from "./HamburgerMenu";
import { t } from "@/lib/i18n";
import {
  COMBO_BADGE_BG,
  COMBO_BADGE_TEXT,
  DELTA_NEGATIVE,
  DELTA_POSITIVE,
} from "@/lib/designTokens";

export default function Header() {
  const {
    timer,
    status,
    theme,
    generatePuzzle,
    darkMode,
    toggleDarkMode,
    locale,
    score,
    combo,
    lastDelta,
  } = useGameStore();
  const [mounted, setMounted] = useState(false);

  // Transient delta toast, keyed by the store event id so repeats re-trigger.
  const [delta, setDelta] = useState<{ value: number; id: number } | null>(
    null,
  );
  const deltaTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    if (!lastDelta) return;
    setDelta(lastDelta);
    if (deltaTimeout.current) clearTimeout(deltaTimeout.current);
    deltaTimeout.current = setTimeout(() => setDelta(null), 1600);
    return () => {
      if (deltaTimeout.current) clearTimeout(deltaTimeout.current);
    };
  }, [lastDelta?.id]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const showCombo = combo >= 2;
  const deltaStyle = delta && delta.value >= 0 ? DELTA_POSITIVE : DELTA_NEGATIVE;

  return (
    <header className="flex items-center justify-between w-full max-w-md p-3 bg-card rounded-3xl shadow-[0_6px_18px_rgba(18,58,94,0.10)] mb-3 transition-colors duration-300">
      <div className="flex items-center gap-2">
        <HamburgerMenu inHeader={true} />
        <span
          aria-hidden="true"
          className="w-9 h-9 rounded-xl bg-icon-bg flex items-center justify-center"
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
        <h1 className="font-display font-extrabold text-ink text-lg">Queens</h1>
      </div>

      <div className="flex items-center gap-1.5 relative">
        {/* Delta toast */}
        {delta && (
          <span
            key={delta.id}
            className="absolute right-[52px] top-full mt-2.5 z-10 whitespace-nowrap font-extrabold text-xs rounded-[10px] px-2 py-[3px] shadow-[0_4px_10px_rgba(18,58,94,0.15)] animate-stripin"
            style={{
              background: darkMode ? deltaStyle.bgDark : deltaStyle.bg,
              color: darkMode ? deltaStyle.colorDark : deltaStyle.color,
            }}
            aria-hidden="true"
          >
            {delta.value >= 0
              ? `+${delta.value.toLocaleString(locale)}`
              : `−${Math.abs(delta.value).toLocaleString(locale)}`}
          </span>
        )}

        {/* TIME chip */}
        <div
          className="flex flex-col items-center bg-chip-bg rounded-xl px-2.5 py-1"
          role="timer"
          aria-label={t(locale, "header.timer", { time: formatTime(timer) })}
          aria-live="off"
        >
          <span className="text-[8px] font-extrabold tracking-wider text-chip-label">
            {t(locale, "header.timeLabel")}
          </span>
          <span className="font-extrabold text-sm text-ink tabular-nums">
            {formatTime(timer)}
          </span>
        </div>

        {/* SCORE chip */}
        <div className="flex flex-col items-center bg-score-bg rounded-xl px-2.5 py-1 relative">
          <span className="text-[8px] font-extrabold tracking-wider text-score-label">
            {t(locale, "header.scoreLabel")}
          </span>
          <span
            className="font-extrabold text-sm text-score-text tabular-nums"
            aria-label={t(locale, "header.scoreAria", { value: score })}
          >
            {score.toLocaleString(locale)}
          </span>
          {showCombo && (
            <span
              className="absolute -top-2 -right-2 text-[9px] font-extrabold rounded-[9px] px-1.5 py-0.5 shadow-[0_2px_6px_rgba(0,0,0,0.15)]"
              style={{ background: COMBO_BADGE_BG, color: COMBO_BADGE_TEXT }}
              aria-label={t(locale, "header.comboAria", { combo })}
            >
              x{combo}
            </span>
          )}
        </div>

        <button
          onClick={toggleDarkMode}
          className="w-9 h-9 rounded-xl bg-icon-bg hover:brightness-95 text-ink flex items-center justify-center transition-all active:scale-90"
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

        <button
          onClick={generatePuzzle}
          className="w-9 h-9 rounded-xl bg-icon-bg hover:brightness-95 flex items-center justify-center transition-all active:scale-90"
          aria-label={t(locale, "header.newPuzzle")}
          title={t(locale, "header.newPuzzle")}
        >
          <div
            className="w-3.5 h-3.5 bg-ink"
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
            aria-hidden="true"
          />
        </button>
      </div>
    </header>
  );
}
