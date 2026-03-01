"use client";

import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { t } from "@/lib/i18n";

/**
 * Invisible live region that announces game events to screen readers.
 */
export default function LiveAnnouncer() {
  const { status, mistakes, xPenalties, locale } = useGameStore();
  const [message, setMessage] = useState("");
  const prevMistakes = useRef(mistakes);
  const prevXPenalties = useRef(xPenalties);
  const prevStatus = useRef(status);

  useEffect(() => {
    // Announce mistake
    if (mistakes > prevMistakes.current) {
      setMessage(t(locale, "announcer.mistake", { count: mistakes }));
    }
    prevMistakes.current = mistakes;
  }, [mistakes, locale]);

  useEffect(() => {
    // Announce X penalty
    if (xPenalties > prevXPenalties.current) {
      setMessage(t(locale, "announcer.xPenalty", { count: xPenalties }));
    }
    prevXPenalties.current = xPenalties;
  }, [xPenalties, locale]);

  useEffect(() => {
    if (status !== prevStatus.current) {
      switch (status) {
        case "generating":
          setMessage(t(locale, "announcer.generating"));
          break;
        case "playing":
          if (prevStatus.current === "generating") {
            setMessage(t(locale, "announcer.ready"));
          }
          break;
        case "won":
          setMessage(t(locale, "announcer.won"));
          break;
      }
    }
    prevStatus.current = status;
  }, [status, locale]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}
