import { useGameStore } from "@/store/gameStore";
import { t } from "@/lib/i18n";
import { FEEDBACK_STYLES } from "@/lib/designTokens";

/**
 * Contextual strip under the header. Shows the interaction tip only.
 * It must never react to score, combo or penalty events: any move-by-move
 * feedback would reveal whether a queen is correctly placed.
 */
export default function MessageStrip() {
  const locale = useGameStore((state) => state.locale);
  const darkMode = useGameStore((state) => state.darkMode);
  const style = FEEDBACK_STYLES.tip;

  return (
    <div
      className="flex items-center gap-2 w-full max-w-md rounded-xl px-3 py-[7px] min-h-[33px] mb-3 animate-stripin"
      style={{ background: darkMode ? style.bgDark : style.bg }}
    >
      <span
        className="w-[18px] h-[18px] rounded-[7px] flex items-center justify-center font-extrabold text-micro flex-shrink-0"
        style={{
          background: darkMode ? style.iconBgDark : style.iconBg,
          color: style.iconColor,
        }}
        aria-hidden="true"
      >
        {style.icon}
      </span>
      <span
        className="font-extrabold text-xs"
        style={{ color: darkMode ? style.colorDark : style.color }}
      >
        {t(locale, "msg.tip")}
      </span>
    </div>
  );
}
