import { useGameStore } from "@/store/gameStore";
import { useEffect, useMemo, useState } from "react";
import { mulberry32 } from "@/lib/random";
import { useHydrated } from "@/lib/useHydrated";

const THEME_PATTERNS: Record<string, string[]> = {
  dino: [
    "pattern-dino-1.svg",
    "pattern-dino-skull.svg",
    "pattern-dino-various-solhouettes.svg",
  ],
  dog: ["pattern-dog-bone.svg", "pattern-dog-house.svg", "pattern-dog-paw.svg"],
  cow: ["pattern-cow-head.svg", "pattern-cow-silhouette.svg"],
  potato: ["pattern-potato-1.svg", "pattern-potato-2.svg"],
  starwars: [
    "pattern-starwars-boba-fett.svg",
    "pattern-starwars-death-star.svg",
    "pattern-starwars-lightsaber.svg",
    "pattern-stawrars-alliance-logo.svg",
    "pattern-stawrars-jedi-logo.svg",
  ],
  elephant: [
    "pattern-elephant-big-animal-huge.svg",
    "pattern-elephant-head-1.svg",
    "pattern-elephant-head-2.svg",
    "pattern-elephant-side-view.svg",
    "pattern-elephant-svgrepo-com.svg",
  ],
  default: [
    "pattern-default-crown-1.svg",
    "pattern-default-crown-2.svg",
    "pattern-default-crown-3.svg",
  ],
};

const MOBILE_MEDIA_QUERY = "(max-width: 767px)";

// Grid density per breakpoint. Mobile uses fewer, smaller elements so the
// pattern stays readable instead of crowding a narrow viewport.
const GRID_BY_BREAKPOINT = {
  mobile: { cols: 3, rows: 5, minSize: 32, sizeRange: 20, jitter: 8 },
  desktop: { cols: 8, rows: 5, minSize: 40, sizeRange: 30, jitter: 10 },
} as const;

interface Pattern {
  id: number;
  src: string;
  top: string;
  left: string;
  size: string;
  rotation: string;
}

/**
 * Lays the decorative shapes out on a grid, one per cell, so they stay evenly
 * spread instead of clumping the way free placement would.
 *
 * Driven by a seeded PRNG rather than Math.random so the result is a pure
 * function of its arguments: React may throw the memo below away and call
 * this again at any time, and the background must not shuffle when it does.
 */
function buildPatterns(
  theme: string,
  isMobile: boolean,
  seed: number,
): Pattern[] {
  const themeKey = THEME_PATTERNS[theme] ? theme : "default";
  const availablePatterns = THEME_PATTERNS[themeKey];
  const { cols, rows, minSize, sizeRange, jitter } =
    GRID_BY_BREAKPOINT[isMobile ? "mobile" : "desktop"];

  const random = mulberry32(seed);
  const patterns: Pattern[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const shape =
        availablePatterns[Math.floor(random() * availablePatterns.length)];

      // Slight offsets so the grid does not read as a grid
      const offsetX = (random() - 0.5) * jitter;
      const offsetY = (random() - 0.5) * jitter;

      patterns.push({
        id: r * cols + c,
        src: `/assets/patterns/${themeKey}/${shape}`,
        top: `${((r + 0.5) / rows) * 100 + offsetY}%`, // Cell center + offset
        left: `${((c + 0.5) / cols) * 100 + offsetX}%`, // Cell center + offset
        size: `${random() * sizeRange + minSize}px`,
        rotation: `${random() * 360}deg`,
      });
    }
  }

  return patterns;
}

export default function BackgroundPattern() {
  const theme = useGameStore((state) => state.theme);
  const hydrated = useHydrated();
  const [isMobile, setIsMobile] = useState(false);

  // One seed per mount: the layout still varies between visits, but it holds
  // still for the life of the component.
  const [seed] = useState(() => (Math.random() * 0x100000000) >>> 0);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    const syncBreakpoint = () => setIsMobile(mediaQuery.matches);

    syncBreakpoint();
    mediaQuery.addEventListener("change", syncBreakpoint);

    return () => mediaQuery.removeEventListener("change", syncBreakpoint);
  }, []);

  // Nothing is painted until hydration: the prerendered HTML is built with
  // whatever theme the clock said at build time and a desktop viewport, and
  // neither survives to the browser.
  const patterns = useMemo(
    () => (hydrated ? buildPatterns(theme, isMobile, seed) : []),
    [hydrated, theme, isMobile, seed],
  );

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 opacity-10">
      {patterns.map((pattern) => (
        <div
          key={pattern.id}
          className="absolute bg-theme-text transition-colors duration-300"
          style={{
            top: pattern.top,
            left: pattern.left,
            width: pattern.size,
            height: pattern.size,
            transform: `translate(-50%, -50%) rotate(${pattern.rotation})`,
            maskImage: `url(${pattern.src})`,
            WebkitMaskImage: `url(${pattern.src})`,
            maskSize: "contain",
            WebkitMaskSize: "contain",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskPosition: "center",
            WebkitMaskPosition: "center",
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
