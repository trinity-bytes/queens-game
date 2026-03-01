"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import BackgroundPattern from "@/components/BackgroundPattern";
import HamburgerMenu from "@/components/HamburgerMenu";
import { useGameStore } from "@/store/gameStore";
import { t } from "@/lib/i18n";

export default function CreditsPage() {
  const locale = useGameStore((state) => state.locale);

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-4 pt-[calc(env(safe-area-inset-top)+5rem)] sm:p-8 sm:pt-[calc(env(safe-area-inset-top)+6rem)] bg-theme-bg transition-colors duration-300 relative z-0">
      <BackgroundPattern />
      <HamburgerMenu />

      <div className="w-full max-w-2xl bg-theme-surface rounded-2xl shadow-xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4 mb-8 border-b border-slate-200 dark:border-slate-700 pb-4">
          <Link
            href="/"
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-theme-text transition-colors"
            aria-label={t(locale, "credits.back")}
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-theme-text flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-theme-accent" />
            {t(locale, "credits.title")}
          </h1>
        </div>

        <div className="space-y-8 text-slate-700 dark:text-slate-300">
          <section>
            <p className="text-lg leading-relaxed mb-6">
              {t(locale, "credits.intro")}
            </p>
            <ul className="space-y-4 text-lg">
              <li className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                <span className="text-2xl">🦖</span>
                <a
                  href="https://www.flaticon.com/free-icons/dinosaur"
                  title="dinosaur icons"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t(locale, "credits.dino")}
                </a>
              </li>
              <li className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                <span className="text-2xl">🐶</span>
                <a
                  href="https://www.flaticon.com/free-icons/dog"
                  title="dog icons"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t(locale, "credits.dog")}
                </a>
              </li>
              <li className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                <span className="text-2xl">🐮</span>
                <a
                  href="https://www.flaticon.com/free-icons/cow"
                  title="cow icons"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t(locale, "credits.cow")}
                </a>
              </li>
              <li className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                <span className="text-2xl">🥔</span>
                <a
                  href="https://www.flaticon.com/free-icons/potato"
                  title="potato icons"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t(locale, "credits.potato")}
                </a>
              </li>
              <li className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                <span className="text-2xl">⚔️</span>
                <a
                  href="https://www.flaticon.com/free-icons/star-wars"
                  title="star wars icons"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t(locale, "credits.starwars")}
                </a>
              </li>
              <li className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                <span className="text-2xl">👑</span>
                <a
                  href="https://www.flaticon.com/free-icons/queen"
                  title="queen icons"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t(locale, "credits.queen")}
                </a>
              </li>
            </ul>
          </section>

          <div className="pt-6 flex justify-center">
            <Link
              href="/"
              className="px-8 py-3 bg-theme-accent hover:brightness-95 text-theme-text font-bold rounded-xl shadow-sm transition-all text-lg"
            >
              {t(locale, "credits.cta")}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
