import { useGameStore } from "@/store/gameStore";
import { useEffect, useState } from "react";

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

export default function BackgroundPattern() {
  const theme = useGameStore((state) => state.theme);
  const [isMobile, setIsMobile] = useState(false);
  const [patterns, setPatterns] = useState<
    {
      id: number;
      src: string;
      top: string;
      left: string;
      size: string;
      rotation: string;
    }[]
  >([]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    const syncBreakpoint = () => setIsMobile(mediaQuery.matches);

    syncBreakpoint();
    mediaQuery.addEventListener("change", syncBreakpoint);

    return () => mediaQuery.removeEventListener("change", syncBreakpoint);
  }, []);

  useEffect(() => {
    const themeKey = THEME_PATTERNS[theme] ? theme : "default";
    const availablePatterns = THEME_PATTERNS[themeKey];

    // Generate a grid of patterns for uniform distribution
    const { cols, rows, minSize, sizeRange, jitter } =
      GRID_BY_BREAKPOINT[isMobile ? "mobile" : "desktop"];
    const newPatterns = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const randomPattern =
          availablePatterns[
            Math.floor(Math.random() * availablePatterns.length)
          ];

        // Add slight random offsets to make it look more organic
        const offsetX = (Math.random() - 0.5) * jitter;
        const offsetY = (Math.random() - 0.5) * jitter;

        newPatterns.push({
          id: r * cols + c,
          src: `/assets/patterns/${themeKey}/${randomPattern}`,
          top: `${((r + 0.5) / rows) * 100 + offsetY}%`, // Cell center + offset
          left: `${((c + 0.5) / cols) * 100 + offsetX}%`, // Cell center + offset
          size: `${Math.random() * sizeRange + minSize}px`,
          rotation: `${Math.random() * 360}deg`,
        });
      }
    }

    setPatterns(newPatterns);
  }, [theme, isMobile]);

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
