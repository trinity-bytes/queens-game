"use client";

import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { t } from "@/lib/i18n";

/**
 * Invisible live region that announces game events to screen readers.
 *
 * Only puzzle lifecycle events are announced. Mistakes and penalties are
 * deliberately silent: announcing them would give assistive-technology users a
 * move-by-move oracle that sighted players no longer have.
 */
export default function LiveAnnouncer() {
  const { status, locale } = useGameStore();
  const [message, setMessage] = useState("");
  const prevStatus = useRef(status);

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
