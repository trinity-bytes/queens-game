"use client";

import Header from "@/components/Header";
import Board from "@/components/Board";
import VictoryModal from "@/components/VictoryModal";
import LiveAnnouncer from "@/components/LiveAnnouncer";
import Link from "next/link";
import { Trophy } from "lucide-react";

export default function Home() {
  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-start p-4 sm:p-8 bg-sky-50"
    >
      <LiveAnnouncer />
      <Header />
      <Board />
      <Link
        href="/leaderboard"
        className="mt-6 inline-flex items-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl shadow-sm transition-colors border border-slate-200"
      >
        <Trophy className="w-5 h-5 text-amber-500" aria-hidden="true" />
        Ver Tabla de Líderes
      </Link>
      <VictoryModal />
    </main>
  );
}
