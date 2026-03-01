"use client";

import Header from "@/components/Header";
import Board from "@/components/Board";
import VictoryModal from "@/components/VictoryModal";
import LiveAnnouncer from "@/components/LiveAnnouncer";
import BackgroundPattern from "@/components/BackgroundPattern";
import { useGameStore } from "@/store/gameStore";
import { useEffect } from "react";
import Link from "next/link";
import { t } from "@/lib/i18n";

const RESET_HOME_ON_RETURN_KEY = "reset-home-on-return-from-leaderboard";

export default function Home() {
  const { generatePuzzle, locale } = useGameStore();

  useEffect(() => {
    const shouldReset =
      sessionStorage.getItem(RESET_HOME_ON_RETURN_KEY) === "1";
    if (!shouldReset) return;

    sessionStorage.removeItem(RESET_HOME_ON_RETURN_KEY);
    generatePuzzle();
  }, [generatePuzzle]);

  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-start p-4 pt-[calc(env(safe-area-inset-top)+1rem)] sm:p-8 sm:pt-[calc(env(safe-area-inset-top)+2rem)] bg-theme-bg transition-colors duration-300 relative z-0"
    >
      <BackgroundPattern />
      <LiveAnnouncer />
      <Header />
      <Board />
      <div className="flex flex-col sm:flex-row gap-4 mt-6">
        <Link
          href="/leaderboard"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-theme-surface hover:brightness-95 text-theme-text font-semibold rounded-xl shadow-sm transition-all border border-slate-200 dark:border-slate-700"
        >
          <img
            src="/assets/icons/trophy.png"
            alt="Trophy"
            className="w-5 h-5 object-contain"
          />
          {t(locale, "home.viewLeaderboard")}
        </Link>
      </div>
      <VictoryModal />
    </main>
  );
}
