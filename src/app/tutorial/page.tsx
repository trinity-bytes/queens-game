"use client";

import Link from "next/link";
import BackgroundPattern from "@/components/BackgroundPattern";
import HamburgerMenu from "@/components/HamburgerMenu";
import { useGameStore } from "@/store/gameStore";
import { t } from "@/lib/i18n";

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

export default function TutorialPage() {
  const locale = useGameStore((state) => state.locale);

  const rules = [
    { title: t(locale, "tutorial.row"), highlight: [3, 4, 5], active: "#bfe0ff", base: "#eef3fa" },
    { title: t(locale, "tutorial.column"), highlight: [1, 4, 7], active: "#bfe0ff", base: "#eef3fa" },
    { title: t(locale, "tutorial.region"), highlight: [1, 3, 4, 5, 7], active: "#ffd3e1", base: "#dbeafe" },
  ];

  const positives = [
    { icon: "✓", text: t(locale, "tutorial.pos1") },
    { icon: "⚡", text: t(locale, "tutorial.pos2") },
    { icon: "★", text: t(locale, "tutorial.pos3") },
  ];
  const negatives = [
    { icon: "✕", text: t(locale, "tutorial.neg1") },
    { icon: "◐", text: t(locale, "tutorial.neg2") },
    { icon: "⏱", text: t(locale, "tutorial.neg3") },
  ];

  return (
    <main
      className="page-shell flex min-h-screen flex-col items-center justify-start bg-theme-bg transition-colors duration-300 relative z-0"
      style={{ "--page-pt": "4rem" } as React.CSSProperties}
    >
      <BackgroundPattern />
      <HamburgerMenu />

      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/"
            className="w-[38px] h-[38px] rounded-[13px] bg-card flex items-center justify-center shadow-[0_4px_10px_rgba(18,58,94,0.08)] text-ink hover:brightness-95 transition-all active:scale-95"
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
            <div className="text-[#b5555e] dark:text-[#e0a3a7] text-xs font-semibold leading-snug">
              {t(locale, "tutorial.goldRuleText")}
            </div>
          </div>
        </div>

        {/* Scoring */}
        <div className="font-extrabold text-ink text-sm mb-2.5">
          {t(locale, "tutorial.scoring")}
        </div>
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="bg-[#eefaf3] dark:bg-[rgba(47,174,118,0.12)] rounded-2xl p-3">
            <div className="font-extrabold text-stat-points text-xs mb-2.5">
              + {t(locale, "tutorial.positive")}
            </div>
            <div className="flex flex-col gap-2">
              {positives.map((s, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="w-[17px] h-[17px] rounded-md bg-[#d3f0e0] text-stat-points text-micro font-extrabold flex items-center justify-center shrink-0 mt-px">
                    {s.icon}
                  </span>
                  <span className="text-xs text-[#3f6b56] dark:text-[#93c4bb] font-semibold leading-snug">
                    {s.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#fff1f0] dark:bg-[rgba(225,92,103,0.12)] rounded-2xl p-3">
            <div className="font-extrabold text-stat-penalty text-xs mb-2.5">
              − {t(locale, "tutorial.penalties")}
            </div>
            <div className="flex flex-col gap-2">
              {negatives.map((s, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="w-[17px] h-[17px] rounded-md bg-[#fbdad9] text-stat-penalty text-micro font-extrabold flex items-center justify-center shrink-0 mt-px">
                    {s.icon}
                  </span>
                  <span className="text-xs text-[#8a4a4f] dark:text-[#e0a3a7] font-semibold leading-snug">
                    {s.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
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
