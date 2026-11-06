"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BackgroundPattern from "@/components/BackgroundPattern";
import BandBadge from "@/components/BandBadge";
import FirstRun from "@/components/FirstRun";
import HamburgerMenu from "@/components/HamburgerMenu";
import { puzzleValue } from "@/domain/scoring";
import { useGameStore } from "@/store/gameStore";
import { t } from "@/lib/i18n";
import { REGION_PALETTE_DARK, REGION_PALETTE_LIGHT } from "@/lib/designTokens";
import { useHydrated } from "@/lib/useHydrated";
import type { DifficultyBand } from "@/workers/puzzleGenerator.types";

const BANDS: DifficultyBand[] = ["gentle", "tricky", "brutal"];

/** Scores are quoted for the board the game deals. */
const STANDARD_GRID = 9;

/** The region the cycle illustration borrows its colour and texture from. */
const CYCLE_REGION = 3;

/** A 3×3 mini illustration used by the rule cards. */
function MiniGrid({
  highlight,
  queen,
  active,
  base,
}: {
  highlight: number[];
  queen: number;
  active: string;
  base: string;
}) {
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-[3px] w-[58px] h-[58px]">
      {Array.from({ length: 9 }, (_, i) => (
        <div
          key={i}
          className="rounded-md flex items-center justify-center"
          style={{ background: highlight.includes(i) ? active : base }}
        >
          {i === queen && <span className="text-sm text-[#123a5e]">♛</span>}
        </div>
      ))}
    </div>
  );
}

function CycleTile({ children }: { children?: React.ReactNode }) {
  const darkMode = useGameStore((state) => state.darkMode);
  const palette = darkMode ? REGION_PALETTE_DARK : REGION_PALETTE_LIGHT;

  return (
    <span
      className={`w-10 h-10 flex items-center justify-center region-pattern-${CYCLE_REGION}`}
      style={{ backgroundColor: palette[CYCLE_REGION] }}
    >
      {children}
    </span>
  );
}

export default function TutorialPage() {
  const locale = useGameStore((state) => state.locale);
  const theme = useGameStore((state) => state.theme);
  const closeFirstRun = useGameStore((state) => state.closeFirstRun);
  const router = useRouter();
  const hydrated = useHydrated();
  const [walkthroughOpen, setWalkthroughOpen] = useState(true);

  const rules = [
    { title: t(locale, "tutorial.row"), highlight: [3, 4, 5], active: "#bfe0ff", base: "#eef3fa" },
    { title: t(locale, "tutorial.column"), highlight: [1, 4, 7], active: "#bfe0ff", base: "#eef3fa" },
    { title: t(locale, "tutorial.region"), highlight: [1, 3, 4, 5, 7], active: "#ffd3e1", base: "#dbeafe" },
  ];

  return (
    <main
      className="page-shell flex min-h-screen flex-col items-center justify-start bg-theme-bg transition-colors duration-300 relative z-0"
      style={{ "--page-pt": "4rem" } as React.CSSProperties}
    >
      <BackgroundPattern />
      <HamburgerMenu />
      {hydrated && walkthroughOpen && (
        <FirstRun
          onSkip={() => {
            closeFirstRun();
            setWalkthroughOpen(false);
          }}
          onPlay={() => {
            closeFirstRun();
            router.push("/");
          }}
        />
      )}

      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/"
            className="w-11 h-11 rounded-[13px] bg-card flex items-center justify-center shadow-[0_4px_10px_rgba(18,58,94,0.08)] text-ink hover:brightness-95 transition-all active:scale-95"
            aria-label={t(locale, "tutorial.back")}
          >
            <span aria-hidden="true" className="text-base">
              ←
            </span>
          </Link>
          <h1 className="font-display text-xl font-extrabold text-ink">
            {t(locale, "tutorial.title")}
          </h1>
        </div>

        <p className="text-muted text-sm font-bold leading-relaxed mb-3.5">
          {t(locale, "tutorial.objectiveText")}
        </p>

        {/* Rules */}
        <div className="bg-card rounded-3xl p-4 mb-3 grid grid-cols-3 gap-2.5">
          {rules.map((rule) => (
            <div key={rule.title} className="flex flex-col items-center gap-2.5">
              <MiniGrid
                highlight={rule.highlight}
                queen={4}
                active={rule.active}
                base={rule.base}
              />
              <div className="font-extrabold text-ink text-sm text-center">
                {rule.title}
              </div>
            </div>
          ))}
        </div>

        {/* Golden rule */}
        <div className="bg-[#fff1f0] dark:bg-[rgba(225,92,103,0.12)] rounded-3xl p-4 mb-3 flex items-center gap-3.5">
          <div className="grid grid-cols-3 grid-rows-3 gap-[3px] w-[58px] h-[58px] shrink-0">
            {Array.from({ length: 9 }, (_, i) => (
              <div
                key={i}
                className="rounded-md flex items-center justify-center"
                style={{ background: i === 4 ? "#eaf4ff" : "#ffd9d9" }}
              >
                {i === 4 ? (
                  <span className="text-sm text-[#123a5e]">♛</span>
                ) : (
                  <span className="text-micro font-extrabold text-stat-penalty">
                    ✕
                  </span>
                )}
              </div>
            ))}
          </div>
          <div>
            <div className="font-extrabold text-badge-errors text-sm mb-1">
              ⚠ {t(locale, "tutorial.goldRule")}
            </div>
            <div className="text-badge-errors text-xs font-semibold leading-snug">
              {t(locale, "tutorial.goldRuleText")}
            </div>
          </div>
        </div>

        {/* Marking */}
        <div className="bg-card rounded-3xl p-4 mb-3 text-center">
          <div className="font-extrabold text-ink text-sm mb-3">
            {t(locale, "tutorial.cycleTitle")}
          </div>
          <div
            className="flex items-center justify-center gap-2.5 mb-3 text-muted"
            aria-hidden="true"
          >
            <CycleTile />
            →
            <CycleTile>
              <img
                src="/assets/figures/x-mark.png"
                alt=""
                className="w-1/2 h-1/2 object-contain opacity-60"
              />
            </CycleTile>
            →
            <CycleTile>
              {hydrated && (
                <img
                  src={`/assets/figures/${theme}.png`}
                  alt=""
                  className="w-[74%] h-[74%] object-contain"
                />
              )}
            </CycleTile>
            →
            <CycleTile />
          </div>
          <p className="text-muted text-xs">{t(locale, "tutorial.markFree")}</p>
        </div>

        {/* Scoring */}
        <div className="bg-card rounded-3xl p-4 mb-4">
          <div className="font-extrabold text-ink text-sm mb-3">
            {t(locale, "tutorial.scoring")}
          </div>
          <ul className="flex flex-col gap-2 mb-3">
            {BANDS.map((band) => (
              <li key={band} className="flex items-center justify-between gap-2">
                <BandBadge band={band} locale={locale} />
                <span className="font-extrabold text-ink text-sm tabular-nums">
                  {puzzleValue(STANDARD_GRID, band).toLocaleString(locale)}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-muted text-xs">{t(locale, "tutorial.scoreNote")}</p>
        </div>

        <div className="flex justify-center">
          <Link
            href="/"
            className="bg-accent text-white font-extrabold rounded-2xl px-7 py-3 text-sm hover:brightness-95 transition-all active:scale-95"
          >
            {t(locale, "tutorial.cta")}
          </Link>
        </div>
      </div>
    </main>
  );
}
