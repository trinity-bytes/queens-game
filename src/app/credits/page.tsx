"use client";

import Link from "next/link";
import BackgroundPattern from "@/components/BackgroundPattern";
import HamburgerMenu from "@/components/HamburgerMenu";
import { useGameStore } from "@/store/gameStore";
import { t } from "@/lib/i18n";

const ATTRIBUTIONS = [
  { emoji: "🦖", key: "credits.dino", href: "https://www.flaticon.com/free-icons/dinosaur" },
  { emoji: "🐶", key: "credits.dog", href: "https://www.flaticon.com/free-icons/dog" },
  { emoji: "🐮", key: "credits.cow", href: "https://www.flaticon.com/free-icons/cow" },
  { emoji: "🥔", key: "credits.potato", href: "https://www.flaticon.com/free-icons/potato" },
  { emoji: "⚔️", key: "credits.starwars", href: "https://www.flaticon.com/free-icons/star-wars" },
  { emoji: "🐘", key: "credits.elephant", href: "https://www.flaticon.com/free-icons/elephant" },
  { emoji: "👑", key: "credits.queen", href: "https://www.flaticon.com/free-icons/queen" },
];

export default function CreditsPage() {
  const locale = useGameStore((state) => state.locale);

  return (
    <main
      id="main-content"
      className="page-shell flex min-h-screen flex-col items-center justify-start bg-theme-bg transition-colors duration-300 relative z-0"
      style={{ "--page-pt": "4rem" } as React.CSSProperties}
    >
      <BackgroundPattern />
      <HamburgerMenu />

      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-5">
          <Link
            href="/"
            className="w-[38px] h-[38px] rounded-[13px] bg-card flex items-center justify-center shadow-[0_4px_10px_rgba(18,58,94,0.08)] text-ink hover:brightness-95 transition-all active:scale-95"
            aria-label={t(locale, "credits.back")}
          >
            <span aria-hidden="true" className="text-base">
              ←
            </span>
          </Link>
          <h1 className="font-display text-xl font-extrabold text-ink">
            {t(locale, "credits.title")}
          </h1>
        </div>

        {/* Author card */}
        <div className="bg-card rounded-3xl p-8 shadow-[0_10px_26px_rgba(18,58,94,0.10)] flex flex-col items-center text-center gap-2.5 mb-4">
          <div className="w-16 h-16 rounded-[20px] bg-[#fff6da] dark:bg-amber-400/15 flex items-center justify-center">
            <img
              src="/assets/icons/trophy.png"
              alt=""
              aria-hidden="true"
              className="w-8 h-8 object-contain"
            />
          </div>
          <div className="font-display font-extrabold text-xl text-ink">
            Queens
          </div>
          <div className="text-muted text-micro font-extrabold uppercase tracking-wider mt-1">
            {t(locale, "credits.designedBy")}
          </div>
          <div className="font-display font-extrabold text-base text-ink">
            trinity-bytes
          </div>
          <div className="flex gap-2 mt-1.5">
            <a
              href="https://github.com/trinity-bytes"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-chip-bg rounded-xl px-3.5 py-2 text-ink font-extrabold text-sm"
            >
              GitHub <span className="text-micro text-muted">↗</span>
            </a>
            <a
              href="https://www.linkedin.com/in/trinitybytes"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-chip-bg rounded-xl px-3.5 py-2 text-ink font-extrabold text-sm"
            >
              LinkedIn <span className="text-micro text-muted">↗</span>
            </a>
          </div>
        </div>

        {/* Icon attributions (required by license) */}
        <p className="text-muted text-sm font-semibold leading-relaxed mb-3 px-1">
          {t(locale, "credits.intro")}
        </p>
        <ul className="flex flex-col gap-2.5">
          {ATTRIBUTIONS.map(({ emoji, key, href }) => (
            <li
              key={key}
              className="flex items-center gap-3 bg-card rounded-2xl px-3.5 py-3 shadow-[0_3px_8px_rgba(18,58,94,0.06)]"
            >
              <span className="w-9 h-9 rounded-xl bg-icon-bg flex items-center justify-center text-xl shrink-0">
                {emoji}
              </span>
              <a
                href={href}
                title={key}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink hover:underline font-bold text-sm"
              >
                {t(locale, key)}
              </a>
            </li>
          ))}
        </ul>

        <div className="pt-6 flex justify-center">
          <Link
            href="/"
            className="bg-accent text-white font-extrabold rounded-2xl px-7 py-3 text-sm hover:brightness-95 transition-all active:scale-95"
          >
            {t(locale, "credits.cta")}
          </Link>
        </div>
      </div>
    </main>
  );
}
