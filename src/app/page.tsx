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
      className="flex min-h-screen flex-col items-center justify-start p-4 sm:p-8 bg-sky-50 dark:bg-slate-900"
    >
      <LiveAnnouncer />
      <Header />
      <Board />
      <Link
        href="/leaderboard"
        className="mt-6 inline-flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl shadow-sm transition-colors border border-slate-200 dark:border-slate-700"
      >
        <Trophy
          className="w-5 h-5 text-amber-500 dark:text-amber-400"
          aria-hidden="true"
        />
        Ver Tabla de Líderes
      </Link>
      <VictoryModal />
    </main>
  );
}
