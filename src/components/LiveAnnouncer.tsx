"use client";

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
  const status = useGameStore((state) => state.status);
  const locale = useGameStore((state) => state.locale);

  // Derived in render rather than pushed in from an effect: the announcement
  // *is* the status, so there is no second copy of it to keep in sync. The
  // live region fires on any text change, which is exactly a status change.
  //
  // Entering "playing" now always announces, including the preloaded path
  // straight out of "won" — that jump used to leave the previous
  // announcement standing and tell the player nothing about the new board.
  let message = "";
  switch (status) {
    case "generating":
      message = t(locale, "announcer.generating");
      break;
    case "playing":
      message = t(locale, "announcer.ready");
      break;
    case "won":
      message = t(locale, "announcer.won");
      break;
    case "error":
      message = t(locale, "announcer.error");
      break;
  }

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
