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
  default: [
    "pattern-default-crown-1.svg",
    "pattern-default-crown-2.svg",
    "pattern-default-crown-3.svg",
  ],
};

export default function BackgroundPattern() {
  const theme = useGameStore((state) => state.theme);
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
    const themeKey = THEME_PATTERNS[theme] ? theme : "default";
    const availablePatterns = THEME_PATTERNS[themeKey];

    // Generate random positions for patterns
    const newPatterns = Array.from({ length: 20 }).map((_, i) => {
      const randomPattern =
        availablePatterns[Math.floor(Math.random() * availablePatterns.length)];
      return {
        id: i,
        src: `/assets/patterns/${themeKey}/${randomPattern}`,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        size: `${Math.random() * 40 + 30}px`, // 30px to 70px
        rotation: `${Math.random() * 360}deg`,
      };
    });

    setPatterns(newPatterns);
  }, [theme]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 opacity-20">
      {patterns.map((pattern) => (
        <div
          key={pattern.id}
          className="absolute bg-theme-text transition-colors duration-300"
          style={{
            top: pattern.top,
            left: pattern.left,
            width: pattern.size,
            height: pattern.size,
            transform: `rotate(${pattern.rotation})`,
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
