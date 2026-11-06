"use client";

import Header from "@/components/Header";
import Board from "@/components/Board";
import GameDock from "@/components/GameDock";
import GameStatus from "@/components/GameStatus";
import MessageStrip from "@/components/MessageStrip";
import VictoryModal from "@/components/VictoryModal";
import LiveAnnouncer from "@/components/LiveAnnouncer";
import BackgroundPattern from "@/components/BackgroundPattern";
import { useGameStore } from "@/store/gameStore";
import { useEffect } from "react";

const RESET_HOME_ON_RETURN_KEY = "reset-home-on-return-from-leaderboard";

export default function Home() {
  const generatePuzzle = useGameStore((state) => state.generatePuzzle);
  const status = useGameStore((state) => state.status);

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
      data-status={status}
      className="game-shell page-shell bg-theme-bg transition-colors duration-300 relative z-0"
    >
      <BackgroundPattern />
      <LiveAnnouncer />
      <div className="game-stage">
        <Board />
        <GameStatus />
      </div>
      <div className="game-panel">
        <Header />
        <MessageStrip />
        <GameStatus />
        <GameDock />
        <VictoryModal />
      </div>
    </main>
  );
}
