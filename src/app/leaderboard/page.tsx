"use client";

import Leaderboard from "@/components/Leaderboard";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function LeaderboardPage() {
  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-start p-4 sm:p-8 bg-sky-50"
    >
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/"
            className="p-2 rounded-full bg-white hover:bg-slate-100 text-slate-600 transition-colors shadow-sm"
            aria-label="Volver al juego"
            title="Volver al juego"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">
            Tabla de Líderes
          </h1>
        </div>

        <Leaderboard fullPage />
      </div>
    </main>
  );
}
