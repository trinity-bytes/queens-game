"use client";

import { useGameStore } from "@/store/gameStore";
import { t } from "@/lib/i18n";

export default function SkipLink() {
  const locale = useGameStore((state) => state.locale);

  return (
    <a href="#main-content" className="skip-to-content">
      {t(locale, "skip.content")}
    </a>
  );
}
