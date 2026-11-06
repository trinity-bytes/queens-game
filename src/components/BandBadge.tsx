import { BAND_MULTIPLIER } from "@/domain/scoring";
import { t, type Locale } from "@/lib/i18n";
import type { DifficultyBand } from "@/workers/puzzleGenerator.types";

/** Cool to hot, so the badge reads as difficulty before the words are parsed. */
const BAND_STYLES: Record<DifficultyBand, string> = {
  gentle: "bg-badge-flawless-bg text-badge-flawless",
  tricky: "bg-[#fff6da] text-stat-total dark:bg-[rgba(201,150,44,0.16)]",
  brutal: "bg-badge-errors-bg text-badge-errors",
};

interface BandBadgeProps {
  band: DifficultyBand;
  locale: Locale;
}

/**
 * The multiplier is shown alongside the band because it is the whole reason a
 * score is what it is. One decimal throughout, so x1.0 lines up with x1.6 and
 * x2.4 instead of rendering as a bare "x1".
 */
export default function BandBadge({ band, locale }: BandBadgeProps) {
  const multiplier = BAND_MULTIPLIER[band].toFixed(1);
  const name = t(locale, `difficulty.${band}`);

  return (
    <span
      role="img"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-micro font-extrabold uppercase tracking-wider ${BAND_STYLES[band]}`}
      aria-label={t(locale, "victory.difficultyAria", {
        band: name,
        multiplier: `x${multiplier}`,
      })}
    >
      <span aria-hidden="true">
        {t(locale, "victory.difficulty")}: {name}
      </span>
      <span aria-hidden="true">×{multiplier}</span>
    </span>
  );
}
