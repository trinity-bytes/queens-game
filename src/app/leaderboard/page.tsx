"use client";

import Leaderboard from "@/components/Leaderboard";
import BackgroundPattern from "@/components/BackgroundPattern";
import Link from "next/link";
import { useGameStore } from "@/store/gameStore";
import { t } from "@/lib/i18n";

export default function LeaderboardPage() {
  const locale = useGameStore((state) => state.locale);

  return (
    <main
      id="main-content"
      className="page-shell flex min-h-screen flex-col items-center justify-start bg-theme-bg transition-colors duration-300 relative z-0"
      style={{ "--page-pt": "0.5rem" } as React.CSSProperties}
    >
      <BackgroundPattern />
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-5">
          <Link
            href="/"
            className="w-[38px] h-[38px] rounded-[13px] bg-card flex items-center justify-center shadow-[0_4px_10px_rgba(18,58,94,0.08)] text-ink hover:brightness-95 transition-all active:scale-95"
            aria-label={t(locale, "leaderboardPage.back")}
            title={t(locale, "leaderboardPage.back")}
          >
            <span aria-hidden="true" className="text-base">
              ←
            </span>
          </Link>
          <h1 className="font-display text-[22px] font-extrabold text-ink">
            {t(locale, "leaderboard.title")}
          </h1>
        </div>

        <Leaderboard fullPage />
      </div>
    </main>
  );
}
