import { formatTime } from "@/lib/formatTime";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { fetchTopScores, type LeaderboardEntry } from "@/lib/leaderboard";
import { pollWhileVisible } from "@/lib/poll";
import { useGameStore } from "@/store/gameStore";
import { t } from "@/lib/i18n";
import { PODIUM_MEDALS } from "@/lib/designTokens";

/** New scores are rare, so a board half a minute old is still a live board. */
const REFRESH_INTERVAL_MS = 30_000;

interface LeaderboardProps {
  fullPage?: boolean;
}

export default function Leaderboard({ fullPage = false }: LeaderboardProps) {
  const locale = useGameStore((state) => state.locale);
  const theme = useGameStore((state) => state.theme);
  const darkMode = useGameStore((state) => state.darkMode);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const limit = fullPage ? 50 : 10;

  useEffect(() => {
    let active = true;

    const loadLeaderboard = async () => {
      try {
        const top = await fetchTopScores(limit);
        if (!active) return;
        setEntries(top);
        setFailed(false);
      } catch (error) {
        // A failed refresh keeps the board already on screen: `failed` only
        // shows once there are no entries to keep.
        console.error("Error fetching leaderboard:", error);
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadLeaderboard();
    const stopPolling = pollWhileVisible(loadLeaderboard, REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      stopPolling();
    };
  }, [limit, attempt]);

  const retry = () => {
    setLoading(true);
    setFailed(false);
    setAttempt((count) => count + 1);
  };

  if (loading) {
    return (
      <div
        className="w-full max-w-md mx-auto flex flex-col gap-2.5"
        role="status"
        aria-busy="true"
        aria-label={t(locale, "leaderboard.loading")}
      >
        {[62, 48, 56, 42, 52].map((w, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 p-3 bg-card rounded-2xl shadow-[0_3px_8px_rgba(18,58,94,0.06)]"
          >
            <div className="w-[26px] h-[26px] rounded-[9px] bg-chip-bg shrink-0 animate-pulse" />
            <div
              className="h-3 rounded-md bg-chip-bg animate-pulse"
              style={{ width: `${w}%` }}
            />
            <div className="h-3 w-12 rounded-md bg-chip-bg opacity-70 ml-auto shrink-0 animate-pulse" />
          </div>
        ))}
        <p className="text-center text-muted text-xs font-bold mt-2">
          {t(locale, "leaderboard.loadingBest")}
        </p>
      </div>
    );
  }

  const mascot = (
    <div className="w-[72px] h-[72px] rounded-[22px] bg-chip-bg flex items-center justify-center">
      <img
        src={`/assets/figures/${theme}.png`}
        alt=""
        aria-hidden="true"
        className="w-11 h-11 object-contain opacity-85"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "/assets/figures/queen.png";
        }}
      />
    </div>
  );

  if (failed && entries.length === 0) {
    return (
      <section
        className="w-full max-w-md mx-auto bg-card rounded-3xl p-8 text-center flex flex-col items-center gap-2.5"
        role="alert"
      >
        {mascot}
        <div className="font-display font-extrabold text-base text-ink">
          {t(locale, "leaderboard.errorTitle")}
        </div>
        <p className="text-muted text-sm leading-relaxed">
          {t(locale, "leaderboard.errorText")}
        </p>
        <button
          type="button"
          onClick={retry}
          className="mt-1.5 min-h-11 bg-accent text-white font-extrabold rounded-2xl px-5 text-sm hover:brightness-95 transition-all active:scale-95"
        >
          {t(locale, "victory.retry")}
        </button>
      </section>
    );
  }

  if (entries.length === 0) {
    return (
      <section
        className="w-full max-w-md mx-auto bg-card rounded-3xl p-8 text-center flex flex-col items-center gap-2.5"
        aria-label={t(locale, "leaderboard.section")}
      >
        {mascot}
        <div className="font-display font-extrabold text-base text-ink">
          {t(locale, "leaderboard.emptyTitle")}
        </div>
        <p className="text-muted text-sm font-semibold leading-relaxed">
          {t(locale, "leaderboard.empty")}
        </p>
        <Link
          href="/"
          className="mt-1.5 bg-accent text-white font-extrabold rounded-2xl px-5 py-2.5 text-sm hover:brightness-95 transition-all active:scale-95"
        >
          {t(locale, "leaderboard.playCta")}
        </Link>
      </section>
    );
  }

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  // Visual podium order: silver, gold, bronze.
  const podiumOrder = [top3[1], top3[0], top3[2]]
    .map((entry, visualIdx) => {
      if (!entry) return null;
      const rank = entry === top3[0] ? 1 : entry === top3[1] ? 2 : 3;
      return { entry, rank, medal: PODIUM_MEDALS[rank - 1], visualIdx };
    })
    .filter(Boolean) as {
    entry: LeaderboardEntry;
    rank: number;
    medal: (typeof PODIUM_MEDALS)[number];
    visualIdx: number;
  }[];

  return (
    <section
      className="w-full max-w-md mx-auto"
      aria-label={t(locale, "leaderboard.section")}
    >
      {/* Podium */}
      <div className="flex items-end justify-center gap-3 mb-6">
        {podiumOrder.map(({ entry, rank, medal }) => (
          <div
            key={entry.id}
            className="flex flex-col items-center gap-1.5 w-[110px]"
          >
            <div
              role="img"
              className="w-[50px] h-[50px] rounded-2xl bg-card shadow-[0_6px_16px_rgba(18,58,94,0.12)] flex items-center justify-center font-extrabold text-xl"
              style={{ color: medal.medalColor }}
              aria-label={t(locale, "leaderboard.position", { position: rank })}
            >
              {rank}
            </div>
            <span className="font-extrabold text-ink text-sm truncate max-w-full px-1">
              {entry.player_name}
            </span>
            <span className="font-extrabold text-stat-total text-sm">
              {entry.score.toLocaleString(locale)}
            </span>
            <div
              className="w-full rounded-t-2xl"
              style={{
                background: darkMode
                  ? `color-mix(in srgb, ${medal.medalColor} 30%, transparent)`
                  : medal.barColor,
                height: `${medal.barHeight}px`,
              }}
            />
          </div>
        ))}
      </div>

      {/* Rest */}
      {rest.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {rest.map((entry, i) => (
            <li
              key={entry.id}
              className="flex items-center justify-between bg-card rounded-2xl px-3.5 py-2.5 shadow-[0_3px_8px_rgba(18,58,94,0.06)]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-[26px] h-[26px] rounded-[9px] bg-chip-bg flex items-center justify-center font-extrabold text-xs text-muted shrink-0">
                  {i + 4}
                </span>
                <span className="font-bold text-ink text-sm truncate">
                  {entry.player_name}
                </span>
                {entry.mistakes === 0 && (
                  <span
                    role="img"
                    className="shrink-0 w-6 h-[18px] flex items-center justify-center text-badge-flawless bg-badge-flawless-bg rounded-full"
                    title={t(locale, "leaderboard.flawlessTitle")}
                    aria-label={t(locale, "leaderboard.flawlessTitle")}
                  >
                    <Check className="w-3 h-3" strokeWidth={3} aria-hidden="true" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                {/* Rows migrated from before move tracking carry null here. */}
                {entry.moves_count != null && (
                  <span className="text-muted text-xs font-semibold opacity-80 hidden sm:inline">
                    {entry.moves_count} {t(locale, "leaderboard.movesShort")}
                  </span>
                )}
                <span
                  role="img"
                  className="font-extrabold text-stat-total text-sm"
                  aria-label={t(locale, "leaderboard.scoreAria", {
                    score: entry.score,
                  })}
                >
                  {entry.score.toLocaleString(locale)}
                </span>
                <span
                  role="img"
                  className="font-bold text-muted text-sm tabular-nums"
                  aria-label={t(locale, "leaderboard.timeAria", {
                    time: formatTime(entry.time_ms),
                  })}
                >
                  {formatTime(entry.time_ms)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
