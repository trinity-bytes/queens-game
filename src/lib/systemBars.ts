/** The default theme's --theme-bg, for what cannot read the stylesheet. */
export const DEFAULT_THEME_COLOR = "#e6f6f4";

/**
 * Paints the phone's system bars with the page background. Reading the
 * stylesheet keeps one source for the 12 theme and mode pairs.
 *
 * It also runs as an inline script, so it must stay self-contained.
 */
export function syncThemeColor() {
  const color = getComputedStyle(document.documentElement)
    .getPropertyValue("--theme-bg")
    .trim();
  if (!color) return;

  // Hydration can add a second tag next to the prerendered one.
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((meta) => meta.setAttribute("content", color));
}

export const SYNC_THEME_COLOR_SCRIPT = `(${syncThemeColor.toString()})()`;
