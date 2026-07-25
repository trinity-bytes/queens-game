import { useGameStore } from "@/store/gameStore";
import { useEffect, useState, useRef } from "react";
import confetti from "canvas-confetti";
import { AlertCircle } from "lucide-react";
import { submitScore } from "@/lib/leaderboard";
import { getSavedNicks, saveNick } from "@/lib/nickStorage";
import Link from "next/link";
import { getVictoryMessage, t } from "@/lib/i18n";
import { playButton, playVictory } from "@/lib/sound";

const RESET_HOME_ON_RETURN_KEY = "reset-home-on-return-from-leaderboard";

/** Stamped on every leaderboard row. Keep in sync with package.json. */
const APP_VERSION = "1.2.1";

/**
 * Checks if user prefers reduced motion.
 */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function VictoryModal() {
  const status = useGameStore((state) => state.status);
  const timer = useGameStore((state) => state.timer);
  const mistakes = useGameStore((state) => state.mistakes);
  const theme = useGameStore((state) => state.theme);
  const generatePuzzle = useGameStore((state) => state.generatePuzzle);
  const score = useGameStore((state) => state.score);
  const grossScore = useGameStore((state) => state.grossScore);
  const totalPenalties = useGameStore((state) => state.totalPenalties);
  const movesCount = useGameStore((state) => state.movesCount);
  const locale = useGameStore((state) => state.locale);
  const currentWinId = useGameStore((state) => state.currentWinId);
  const savedWinId = useGameStore((state) => state.savedWinId);
  const markCurrentWinSaved = useGameStore((state) => state.markCurrentWinSaved);

  const [name, setName] = useState(() => getSavedNicks()[0] ?? "");
  const [saving, setSaving] = useState(false);
  const nickSuggestions = getSavedNicks();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Derived here rather than read through a store method: a method would call
  // get() without subscribing, so the "saved" badge would never appear.
  const saved = Boolean(currentWinId && savedWinId === currentWinId);

  useEffect(() => {
    if (status === "won") {
      playVictory();

      if (!prefersReducedMotion()) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#38bdf8", "#818cf8", "#c084fc", "#f472b6"],
        });
      }

      // Save previous focus and move focus into modal
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Defer to allow render
      requestAnimationFrame(() => {
        modalRef.current?.focus();
      });
    } else {
      // Return focus when modal closes
      previousFocusRef.current?.focus();
    }
  }, [status]);

  /**
   * Sends the run to the database. The server re-validates every field and
   * dedupes on the win id, so calling this twice for the same win is safe.
   */
  const persistScore = async (playerName: string) => {
    if (!currentWinId) return;

    await submitScore({
      winId: currentWinId,
      playerName,
      score,
      timeMs: timer,
      mistakes,
      movesCount,
      themeUsed: theme,
      locale,
      appVersion: APP_VERSION,
    });
    markCurrentWinSaved();
  };

  const handlePlayAgain = async () => {
    if (saving) return;
    playButton();

    if (!saved) {
      setSaving(true);
      try {
        await persistScore(name.trim() || t(locale, "victory.unknown"));
        if (name.trim()) {
          saveNick(name.trim());
        }
      } catch (error) {
        console.error("Error auto-saving score:", error);
      } finally {
        setSaving(false);
      }
    }

    setName(getSavedNicks()[0] ?? "");
    generatePuzzle();
  };

  // Focus trap: keep Tab/Shift+Tab inside modal.
  //
  // Not memoised: it depends on handlePlayAgain, which is rebuilt every render,
  // so a useCallback here never returned a stable reference. It is only ever
  // attached to a plain DOM element, so there is nothing to gain from one.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handlePlayAgain();
      return;
    }

    if (e.key !== "Tab") return;

    const modal = modalRef.current;
    if (!modal) return;

    const focusable = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  if (status !== "won") return null;

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || saved || !name.trim()) return;

    playButton();
    setSaving(true);
    try {
      await persistScore(name.trim());
      saveNick(name.trim());
    } catch (error) {
      console.error("Error saving score:", error);
      alert(t(locale, "victory.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-[rgba(18,58,94,0.35)] backdrop-blur-sm flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="victory-title"
      ref={modalRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <div className="bg-card rounded-[26px] shadow-[0_24px_40px_rgba(0,0,0,0.25)] w-full max-w-sm p-6 animate-qpop max-h-full overflow-auto">
        <div className="text-center mb-4">
          <div className="w-[70px] h-[70px] rounded-[22px] bg-[#fff6da] dark:bg-amber-400/15 flex items-center justify-center mx-auto mb-3">
            <img
              src="/assets/icons/trophy.png"
              alt="Trophy"
              className="w-9 h-9 object-contain"
            />
          </div>
          <h2
            id="victory-title"
            className="font-display text-2xl font-extrabold text-ink"
          >
            {t(locale, "victory.title")}
          </h2>
          <p className="text-muted font-bold mt-1 text-sm">
            {getVictoryMessage(locale, theme, currentWinId)}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5 my-[18px]">
          <div className="rounded-2xl p-[11px_6px] text-center bg-[#f3f9ff] dark:bg-[rgba(47,174,118,0.12)]">
            <div className="text-[10px] font-extrabold text-muted">
              {t(locale, "victory.points")}
            </div>
            <div
              className="font-display font-black text-lg mt-0.5 text-[#2fae76]"
              aria-label={t(locale, "victory.pointsAria", { value: grossScore })}
            >
              +{grossScore.toLocaleString(locale)}
            </div>
          </div>
          <div className="rounded-2xl p-[11px_6px] text-center bg-[#fff1f0] dark:bg-[rgba(225,92,103,0.12)]">
            <div className="text-[10px] font-extrabold text-muted flex items-center justify-center gap-0.5">
              <AlertCircle className="w-3 h-3" aria-hidden="true" />
              {t(locale, "victory.penalty")}
            </div>
            <div
              className="font-display font-black text-lg mt-0.5 text-[#e15c67]"
              aria-label={t(locale, "victory.penaltiesAria", {
                value: totalPenalties,
              })}
            >
              −{totalPenalties.toLocaleString(locale)}
            </div>
          </div>
          <div className="rounded-2xl p-[11px_6px] text-center bg-[#fff6da] dark:bg-[rgba(201,150,44,0.12)]">
            <div className="text-[10px] font-extrabold text-muted">
              {t(locale, "victory.total")}
            </div>
            <div
              className="font-display font-black text-lg mt-0.5 text-[#c9962c]"
              aria-label={t(locale, "victory.totalAria", { value: score })}
            >
              {score.toLocaleString(locale)}
            </div>
          </div>
        </div>

        <div className="bg-chip-bg rounded-2xl p-3 mb-[18px] text-center relative">
          <div
            className={`absolute -top-[11px] left-1/2 -translate-x-1/2 text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-xl border-2 border-card ${
              mistakes === 0
                ? "bg-[#e3f9ec] text-[#1f9d5f]"
                : "bg-[#fbdad9] text-[#d5525d]"
            }`}
          >
            {mistakes === 0
              ? t(locale, "victory.flawless")
              : t(locale, "victory.errorsBadge", { count: mistakes })}
          </div>
          <p className="text-[11px] font-bold text-muted mt-1">
            {t(locale, "victory.yourTime")}
          </p>
          <p className="font-display text-[26px] font-black text-ink tabular-nums">
            {formatTime(timer)}
          </p>
          <p className="text-[11px] text-muted opacity-80 mt-1 font-semibold">
            {t(locale, "victory.completedMoves", { moves: movesCount })}
          </p>
        </div>

        {!saved ? (
          <form onSubmit={handleSave} className="mb-3">
            <label
              htmlFor="player-name"
              className="block text-[12.5px] font-extrabold text-muted mb-[7px]"
            >
              {t(locale, "victory.saveRecord")}
            </label>
            <div className="flex gap-2">
              <input
                id="player-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t(locale, "victory.namePlaceholder")}
                className="flex-1 min-w-0 bg-chip-bg border-0 rounded-2xl px-3.5 py-2.5 text-ink font-bold focus:outline-none focus:ring-2 focus:ring-accent"
                maxLength={15}
                required
                list="nick-suggestions"
                autoComplete="off"
              />
              <datalist id="nick-suggestions">
                {nickSuggestions.map((nick) => (
                  <option key={nick} value={nick} />
                ))}
              </datalist>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="px-4 bg-accent text-white rounded-2xl font-extrabold hover:brightness-95 disabled:opacity-50 transition-all active:scale-95"
              >
                {saving
                  ? t(locale, "victory.saving")
                  : t(locale, "victory.save")}
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-3">
            <Link
              href="/leaderboard"
              onClick={() =>
                sessionStorage.setItem(RESET_HOME_ON_RETURN_KEY, "1")
              }
              className="w-full py-[11px] px-2 bg-[#e3f9ec] dark:bg-[rgba(31,157,95,0.16)] text-[#1f7a4d] dark:text-[#6fe0ac] rounded-2xl font-extrabold text-[13.5px] flex items-center justify-center gap-2 hover:brightness-95 transition-all active:scale-[0.97]"
              role="alert"
            >
              ✓ {t(locale, "victory.saved")}
            </Link>
          </div>
        )}

        <button
          onClick={handlePlayAgain}
          className="w-full py-3 bg-ink text-card rounded-2xl font-extrabold flex items-center justify-center gap-2 hover:brightness-110 transition-all active:scale-[0.97]"
        >
          <div
            className="w-[15px] h-[15px] bg-card"
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
          {t(locale, "victory.playAgain")}
        </button>
      </div>
    </div>
  );
}
