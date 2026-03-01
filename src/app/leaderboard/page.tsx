"use client";

import Leaderboard from "@/components/Leaderboard";
import BackgroundPattern from "@/components/BackgroundPattern";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useGameStore } from "@/store/gameStore";
import { t } from "@/lib/i18n";

export default function LeaderboardPage() {
  const locale = useGameStore((state) => state.locale);

  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-start p-4 pt-[calc(env(safe-area-inset-top)+1rem)] sm:p-8 sm:pt-[calc(env(safe-area-inset-top)+2rem)] bg-theme-bg transition-colors duration-300"
    >
      <BackgroundPattern />
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/"
            className="p-2 rounded-full bg-theme-surface hover:brightness-95 text-theme-text transition-all shadow-sm"
            aria-label={t(locale, "leaderboardPage.back")}
            title={t(locale, "leaderboardPage.back")}
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <h1 className="text-2xl font-bold text-theme-text">
            {t(locale, "leaderboardPage.title")}
          </h1>
        </div>

        <Leaderboard fullPage />
      </div>
    </main>
  );
}
