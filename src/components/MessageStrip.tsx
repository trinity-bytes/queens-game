import { useGameStore } from "@/store/gameStore";
import { t } from "@/lib/i18n";
import { useConflicts } from "@/lib/useConflicts";

/**
 * Contextual strip under the header: the interaction tip, or the rule two
 * queens are breaking. It describes only what is already visible on the board.
 * It must never react to the stored solution or the score, because move-by-move
 * feedback would reveal whether a queen is correctly placed.
 */
export default function MessageStrip() {
  const locale = useGameStore((state) => state.locale);
  const { rule } = useConflicts();

  return (
    <div
      className="game-tip flex items-center gap-2 w-full rounded-xl bg-card px-3 py-[7px] min-h-[33px]"
      aria-live="polite"
    >
      <span
        className="w-[18px] h-[18px] rounded-[7px] flex items-center justify-center font-extrabold text-micro text-ink bg-icon-bg flex-shrink-0"
        aria-hidden="true"
      >
        {rule ? "!" : "☝"}
      </span>
      <span className="font-extrabold text-xs text-muted">
        {t(locale, rule ? `msg.conflict.${rule}` : "msg.tip")}
      </span>
    </div>
  );
}
