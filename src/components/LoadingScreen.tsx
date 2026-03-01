import { useEffect, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { t } from "@/lib/i18n";

export default function LoadingScreen() {
  const locale = useGameStore((state) => state.locale);
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
          <div className="w-12 h-12 border-4 border-theme-accent border-t-theme-text rounded-full animate-spin"></div>
          <p className="text-theme-text font-medium animate-pulse">
            {t(locale, "loading.text")}
          </p>
        </div>
      </div>
    </>
  );
}
