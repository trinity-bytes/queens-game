"use client";

import Header from "@/components/Header";
import Board from "@/components/Board";
import MessageStrip from "@/components/MessageStrip";
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
      className="page-shell flex min-h-screen flex-col items-center justify-start bg-theme-bg transition-colors duration-300 relative z-0"
    >
      <BackgroundPattern />
      <LiveAnnouncer />
      <Header />
      <MessageStrip />
      <Board />
      <div className="flex justify-center mt-5">
        <Link
          href="/leaderboard"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-card hover:-translate-y-px text-ink font-extrabold rounded-[18px] shadow-[0_6px_16px_rgba(18,58,94,0.10)] transition-all active:scale-[0.97]"
        >
          <img
            src="/assets/icons/trophy.png"
            alt="Trophy"
            className="w-[18px] h-[18px] object-contain"
          />
          {t(locale, "home.viewLeaderboard")}
        </Link>
      </div>
      <VictoryModal />
    </main>
  );
}
