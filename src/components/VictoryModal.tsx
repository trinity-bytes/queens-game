import { useGameStore } from "@/store/gameStore";
import BandBadge from "./BandBadge";
import { useEffect, useState, useRef } from "react";
import confetti from "canvas-confetti";
import { submitScore } from "@/lib/leaderboard";
import { getSavedNicks, saveNick } from "@/lib/nickStorage";
import Link from "next/link";
import { getVictoryMessage, t } from "@/lib/i18n";
import { playButton, playVictory } from "@/lib/sound";

const RESET_HOME_ON_RETURN_KEY = "reset-home-on-return-from-leaderboard";

/** Stamped on every leaderboard row. Inlined from package.json at build time. */
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION;

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
  const gridSize = useGameStore((state) => state.gridSize);
  const difficulty = useGameStore((state) => state.difficulty);
  const solveLog = useGameStore((state) => state.solveLog);
  const currentWinId = useGameStore((state) => state.currentWinId);
  const savedWinId = useGameStore((state) => state.savedWinId);
  const markCurrentWinSaved = useGameStore((state) => state.markCurrentWinSaved);

  const [name, setName] = useState(() => getSavedNicks()[0] ?? "");
  const [saving, setSaving] = useState(false);
  const [publishFailed, setPublishFailed] = useState(false);
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
    // Without a rating the server cannot reproduce the score and would reject
    // the row, so this is a failed publish like any other.
    if (!currentWinId || !difficulty) {
      throw new Error("The win has no rating to publish");
    }

    await submitScore({
      winId: currentWinId,
      playerName,
      score,
      timeMs: timer,
      mistakes,
      movesCount,
      gridSize,
      themeUsed: theme,
      locale,
      appVersion: APP_VERSION,
      difficultyBand: difficulty.band,
      difficultyScore: difficulty.lookaheads,
      solveLog,
    });
    markCurrentWinSaved();
  };

  // Never writes to the leaderboard: only Publish does, because a score posted
  // on the way out is one the player did not choose to share.
  const handlePlayAgain = () => {
    if (saving) return;
    playButton();
    setPublishFailed(false);
    setName(getSavedNicks()[0] ?? "");
    generatePuzzle();
  };

  // Focus trap: keep Tab/Shift+Tab inside modal. Esc is deliberately inert: the
  // sheet is the only place the score lives, so a stray key must not lose it.
  const handleKeyDown = (e: React.KeyboardEvent) => {
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
    setPublishFailed(false);
    try {
      await persistScore(name.trim());
      saveNick(name.trim());
    } catch (error) {
      console.error("Error saving score:", error);
      setPublishFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const percentLost =
    grossScore > 0 ? Math.round((totalPenalties / grossScore) * 100) : 0;
  const errorsLabel = t(
    locale,
    mistakes === 1 ? "victory.errorsBadge.one" : "victory.errorsBadge",
    { count: mistakes },
  );

  return (
    <div
      className="victory-sheet bg-card rounded-[26px] shadow-[0_24px_40px_rgba(18,58,94,0.25)] p-4 animate-stripin outline-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="victory-title"
      ref={modalRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center gap-3">
        <span className="w-12 h-12 shrink-0 rounded-2xl bg-icon-bg flex items-center justify-center">
          <img
            src={`/assets/figures/${theme}.png`}
            alt=""
            className="w-9 h-9 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/assets/figures/queen.png";
            }}
          />
        </span>
        <div className="min-w-0">
          <h2
            id="victory-title"
            className="font-display text-xl font-extrabold text-ink"
          >
            {t(locale, "victory.title")}
          </h2>
          <p className="text-muted text-xs">
            {getVictoryMessage(locale, theme, currentWinId)}
          </p>
        </div>
      </div>

      <div className="flex items-end justify-between gap-3 mt-3">
        <p
          className="font-display text-display font-extrabold text-ink tabular-nums"
          aria-label={t(locale, "victory.totalAria", { value: score })}
        >
          {score.toLocaleString(locale)}
        </p>
        <div className="text-right shrink-0 pb-1">
          <p className="text-sm font-extrabold text-ink tabular-nums">
            {formatTime(timer)}
          </p>
          <p className="text-micro text-muted">
            {t(locale, "victory.moves", { moves: movesCount })}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2.5">
        {difficulty && <BandBadge band={difficulty.band} locale={locale} />}
        <span
          className={`px-2.5 py-1 rounded-xl text-micro font-extrabold uppercase tracking-wider ${
            mistakes === 0
              ? "bg-badge-flawless-bg text-badge-flawless"
              : "bg-badge-errors-bg text-badge-errors"
          }`}
        >
          {mistakes === 0 ? t(locale, "victory.flawless") : errorsLabel}
        </span>
      </div>

      {mistakes > 0 && (
        <p className="text-xs text-muted mt-2.5">
          {t(locale, "victory.breakdown", {
            value: grossScore.toLocaleString(locale),
            percent: percentLost,
            errors: errorsLabel.toLowerCase(),
          })}
        </p>
      )}

      {!saved ? (
        <form onSubmit={handleSave} className="mt-3">
          <div className="flex gap-2">
            <label htmlFor="player-name" className="sr-only">
              {t(locale, "victory.namePlaceholder")}
            </label>
            <input
              id="player-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t(locale, "victory.namePlaceholder")}
              className="flex-1 min-w-0 min-h-11 bg-chip-bg border-0 rounded-2xl px-3.5 text-base text-ink font-bold"
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
              className="min-h-11 px-4 bg-accent text-white rounded-2xl text-sm font-extrabold hover:brightness-95 disabled:opacity-50 transition-all active:scale-95"
            >
              {saving
                ? t(locale, "victory.saving")
                : publishFailed
                  ? t(locale, "victory.retry")
                  : t(locale, "victory.save")}
            </button>
          </div>
          {publishFailed ? (
            <p role="alert" className="mt-2 text-xs font-extrabold text-stat-penalty">
              {t(locale, "victory.publishError")}
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted">
              {t(locale, "victory.publishNote")}
            </p>
          )}
        </form>
      ) : (
        <div
          role="status"
          className="mt-3 flex items-center justify-between gap-2 min-h-11 px-3.5 rounded-2xl bg-badge-flawless-bg text-badge-flawless text-sm font-extrabold"
        >
          <span className="min-w-0 truncate">
            ✓ {t(locale, "victory.saved", { name: name.trim() })}
          </span>
          <Link
            href="/leaderboard"
            onClick={() =>
              sessionStorage.setItem(RESET_HOME_ON_RETURN_KEY, "1")
            }
            className="shrink-0 py-2 hover:underline"
          >
            {t(locale, "victory.viewRanking")}
          </Link>
        </div>
      )}

      <button
        type="button"
        onClick={handlePlayAgain}
        className="mt-3 w-full min-h-11 bg-ink text-card rounded-2xl text-sm font-extrabold hover:brightness-110 transition-all active:scale-[0.97]"
      >
        {t(locale, "victory.playAgain")}
      </button>
    </div>
  );
}
