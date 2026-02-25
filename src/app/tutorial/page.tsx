"use client";

import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import BackgroundPattern from "@/components/BackgroundPattern";
import HamburgerMenu from "@/components/HamburgerMenu";

export default function TutorialPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-4 pt-[calc(env(safe-area-inset-top)+5rem)] sm:p-8 sm:pt-[calc(env(safe-area-inset-top)+6rem)] bg-theme-bg transition-colors duration-300 relative z-0">
      <BackgroundPattern />
      <HamburgerMenu />

      <div className="w-full max-w-2xl bg-theme-surface rounded-2xl shadow-xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4 mb-8 border-b border-slate-200 dark:border-slate-700 pb-4">
          <Link
            href="/"
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-theme-text transition-colors"
            aria-label="Volver al juego"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-theme-text flex items-center gap-3">
            <Info className="w-8 h-8 text-theme-accent" />
            Cómo Jugar
          </h1>
        </div>

        <div className="space-y-8 text-slate-700 dark:text-slate-300">
          <section>
            <h2 className="text-xl font-semibold text-theme-text mb-4">
              El Objetivo
            </h2>
            <p className="text-lg leading-relaxed">
              El objetivo del juego es colocar exactamente{" "}
              <strong>una reina</strong> en cada:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 text-lg">
              <li>Fila</li>
              <li>Columna</li>
              <li>Región de color</li>
            </ul>
          </section>

          <section className="bg-rose-50 dark:bg-rose-950/30 p-6 rounded-xl border border-rose-200 dark:border-rose-900/50">
            <h2 className="text-xl font-semibold text-rose-600 dark:text-rose-400 mb-2">
              Regla de Oro
            </h2>
            <p className="text-lg text-rose-700 dark:text-rose-300">
              ¡Las reinas no pueden tocarse entre sí, ni siquiera en diagonal!
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-theme-text mb-4">
              Sistema de Puntaje
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                <h3 className="font-medium text-green-600 dark:text-green-400 mb-2 flex items-center gap-2">
                  <span className="text-2xl">+</span> Puntos Positivos
                </h3>
                <ul className="space-y-2">
                  <li>
                    <strong className="text-theme-text">500 pts</strong> por
                    reina correcta.
                  </li>
                  <li>
                    <strong>Bono de velocidad</strong> por colocar reinas
                    rápido.
                  </li>
                  <li>
                    <strong className="text-amber-500">
                      Multiplicador de Combo
                    </strong>{" "}
                    (hasta x5) por aciertos consecutivos rápidos.
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                <h3 className="font-medium text-rose-600 dark:text-rose-400 mb-2 flex items-center gap-2">
                  <span className="text-2xl">-</span> Penalizaciones
                </h3>
                <ul className="space-y-2">
                  <li>
                    <strong className="text-theme-text">-200 pts</strong> por
                    colocar una reina incorrecta.
                  </li>
                  <li>
                    <strong className="text-orange-500">-50 pts</strong> por
                    colocar una 'X' incorrecta.
                  </li>
                  <li>
                    <strong className="text-slate-500">-5 pts</strong> por cada
                    segundo que pasa.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <div className="pt-6 flex justify-center">
            <Link
              href="/"
              className="px-8 py-3 bg-theme-accent hover:brightness-95 text-theme-text font-bold rounded-xl shadow-sm transition-all text-lg"
            >
              ¡Entendido, a jugar!
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
