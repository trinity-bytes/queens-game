import { ratingMultiplier } from "@/domain/scoring";
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
  /**
   * The puzzle's rating. When given, the badge also shows the multiplier it
   * earned, because that is the whole reason a score is what it is. Without
   * one the badge only names the band, as the tutorial does.
   */
  rating?: number;
}

/**
 * Two decimals throughout, so x1.00 lines up with x3.88 instead of rendering
 * as a bare "x1".
 */
export default function BandBadge({ band, locale, rating }: BandBadgeProps) {
  const name = t(locale, `difficulty.${band}`);
  const multiplier =
    rating === undefined ? null : ratingMultiplier(rating).toFixed(2);

  return (
    <span
      role="img"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-micro font-extrabold uppercase tracking-wider ${BAND_STYLES[band]}`}
      aria-label={
        multiplier === null
          ? t(locale, "victory.difficultyBandAria", { band: name })
          : t(locale, "victory.difficultyAria", {
              band: name,
              multiplier: `x${multiplier}`,
            })
      }
    >
      <span aria-hidden="true">
        {t(locale, "victory.difficulty")}: {name}
      </span>
      {multiplier !== null && <span aria-hidden="true">×{multiplier}</span>}
    </span>
  );
}
