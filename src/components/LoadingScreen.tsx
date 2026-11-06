"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { t } from "@/lib/i18n";

export default function LoadingScreen() {
  const locale = useGameStore((state) => state.locale);
  const theme = useGameStore((state) => state.theme);
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Start fading out after a short delay to ensure everything is rendered
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, 100);

    // Remove from DOM after fade transition completes
    const removeTimer = setTimeout(() => {
      setIsVisible(false);
    }, 400); // 100ms delay + 300ms transition

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <>
      <noscript>
        <style>{`
          #loading-screen { display: none !important; }
        `}</style>
      </noscript>
      <div
        id="loading-screen"
        className={`fixed inset-0 z-[9999] flex items-center justify-center bg-theme-bg transition-opacity duration-300 ${
          isFading ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-[110px] h-[110px] rounded-[32px] bg-card shadow-[0_12px_28px_rgba(18,58,94,0.14)] flex items-center justify-center">
            <img
              suppressHydrationWarning
              src={`/assets/figures/${theme}.png`}
              alt=""
              aria-hidden="true"
              className="w-16 h-16 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "/assets/figures/queen.png";
              }}
            />
          </div>
          <div className="flex gap-2" aria-hidden="true">
            <span className="w-2.5 h-2.5 rounded-full bg-accent dot-bounce" />
            <span className="w-2.5 h-2.5 rounded-full bg-accent opacity-60 dot-bounce [animation-delay:0.15s]" />
            <span className="w-2.5 h-2.5 rounded-full bg-accent opacity-30 dot-bounce [animation-delay:0.3s]" />
          </div>
          <p className="font-display font-extrabold text-xl text-ink">
            {t(locale, "loading.text")}
          </p>
          <p className="text-sm font-semibold text-muted">
            {t(locale, "loading.subtitle")}
          </p>
        </div>
      </div>
    </>
  );
}
