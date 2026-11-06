"use client";

import { useLayoutEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import { getInitialLocale, t } from "@/lib/i18n";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? () => undefined : useLayoutEffect;

/**
 * Applies the store to what the layout, as a server component, cannot reach:
 * the <html> element and the head.
 *
 * It also brings in the player's language. The store starts on the language the
 * pages were prerendered in, so that the first client render matches the HTML;
 * reading the stored language any earlier broke hydration in every other locale.
 * A layout effect runs before paint, so the swap is never seen.
 */
export default function DocumentSync() {
  const darkMode = useGameStore((state) => state.darkMode);
  const theme = useGameStore((state) => state.theme);
  const locale = useGameStore((state) => state.locale);

  useIsomorphicLayoutEffect(() => {
    useGameStore.setState({ locale: getInitialLocale() });
  }, []);

  useIsomorphicLayoutEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("dark", darkMode);
    html.classList.forEach((name) => {
      if (name.startsWith("theme-")) html.classList.remove(name);
    });
    html.classList.add(`theme-${theme}`);

    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", darkMode ? "#0f172a" : "#f0f9ff");
  }, [darkMode, theme]);

  useIsomorphicLayoutEffect(() => {
    document.documentElement.lang = locale;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", t(locale, "app.description"));
  }, [locale]);

  return null;
}
