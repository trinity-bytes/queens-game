import { useEffect, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { t } from "@/lib/i18n";
import { FEEDBACK_STYLES, FeedbackType } from "@/lib/designTokens";

interface ActiveMessage {
  type: FeedbackType;
  text: string;
  id: number;
}

/**
 * Contextual strip under the header. Shows a default tip and briefly swaps to
 * combo / penalty feedback when the store emits a message event.
 */
export default function MessageStrip() {
  const { lastMessage, locale, darkMode } = useGameStore();
  const [active, setActive] = useState<ActiveMessage | null>(null);

  useEffect(() => {
    if (!lastMessage) return;
    setActive({
      type: lastMessage.type,
      text: t(locale, lastMessage.textKey, lastMessage.vars),
      id: lastMessage.id,
    });
    const timeout = setTimeout(() => setActive(null), 2400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage?.id]);

  const type: FeedbackType = active ? active.type : "tip";
  const style = FEEDBACK_STYLES[type];
  const text = active ? active.text : t(locale, "msg.tip");

  return (
    <div
      className="flex items-center gap-2 w-full max-w-md rounded-xl px-3 py-[7px] min-h-[33px] mb-3 animate-stripin"
      style={{ background: darkMode ? style.bgDark : style.bg }}
      aria-live="polite"
      key={active?.id ?? "tip"}
    >
      <span
        className="w-[18px] h-[18px] rounded-[7px] flex items-center justify-center font-black text-[11px] flex-shrink-0"
        style={{
          background: darkMode ? style.iconBgDark : style.iconBg,
          color: type === "tip" ? style.iconColor : style.iconColor,
        }}
        aria-hidden="true"
      >
        {style.icon}
      </span>
      <span
        className="font-extrabold text-xs"
        style={{ color: darkMode ? style.colorDark : style.color }}
      >
        {text}
      </span>
    </div>
  );
}
