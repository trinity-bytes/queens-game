"use client";

import Header from "@/components/Header";
import Board from "@/components/Board";
import VictoryModal from "@/components/VictoryModal";
import LiveAnnouncer from "@/components/LiveAnnouncer";
import BackgroundPattern from "@/components/BackgroundPattern";
import Link from "next/link";
import { Info } from "lucide-react";

export default function Home() {
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
          Ver Tabla de Líderes
        </Link>
        <Link
          href="/credits"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-theme-surface hover:brightness-95 text-theme-text font-semibold rounded-xl shadow-sm transition-all border border-slate-200 dark:border-slate-700"
        >
          <Info className="w-5 h-5" />
          Créditos y Licencias
        </Link>
      </div>
      <VictoryModal />
    </main>
  );
}
