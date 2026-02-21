"use client";

import Header from "@/components/Header";
import Board from "@/components/Board";
import VictoryModal from "@/components/VictoryModal";
import Leaderboard from "@/components/Leaderboard";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-4 sm:p-8 bg-sky-50">
      <Header />
      <Board />
      <Leaderboard />
      <VictoryModal />
    </main>
  );
}
