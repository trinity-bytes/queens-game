/**
 * Theme-independent design constants from the Queens redesign.
 *
 * The board region colors are the SAME candy pastels across every theme —
 * only the surrounding chrome (page bg, chips, header, CTA, mascot) is tinted
 * per theme via CSS variables. Feedback colors (combo, delta, messages) are
 * also fixed so the "juice" reads consistently in any theme.
 */

/** Pastel region fills for the board, light mode. Index by regionId % length. */
export const REGION_PALETTE_LIGHT = [
  "#ffe1ec",
  "#fff3c4",
  "#d9f5e3",
  "#dbeafe",
  "#e8e1ff",
  "#ffe4cf",
  "#d2f5f2",
  "#f4e0ff",
  "#e2f7cf",
] as const;

/** Pastel region fills for the board, dark mode. Index by regionId % length. */
export const REGION_PALETTE_DARK = [
  "#5c3448",
  "#5c4d20",
  "#2c5c42",
  "#2a4266",
  "#402f66",
  "#5c3d26",
  "#264d4d",
  "#4a2f66",
  "#3d4d2a",
] as const;

/** Uniform hairline between cells — regions read from the pastel color change. */
export const CELL_EDGE_LIGHT = "rgba(18,58,94,0.06)";
export const CELL_EDGE_DARK = "rgba(255,255,255,0.08)";

/** Transient tint applied to a cell in conflict / wrong placement. */
export const CELL_CONFLICT_LIGHT = "#ffd9d9";
export const CELL_CONFLICT_DARK = "#5a2a2a";

/** Combo badge on the PUNTOS chip. */
export const COMBO_BADGE_BG = "#ff8fab";
export const COMBO_BADGE_TEXT = "#ffffff";

export type FeedbackType = "good" | "bad" | "warn" | "tip";

interface FeedbackStyle {
  bg: string;
  iconBg: string;
  iconColor: string;
  color: string;
  icon: string;
  /** dark-mode variants */
  bgDark: string;
  iconBgDark: string;
  colorDark: string;
}

/** Message-strip styling per feedback type (light + dark). */
export const FEEDBACK_STYLES: Record<FeedbackType, FeedbackStyle> = {
  good: {
    bg: "#e3f9ec",
    iconBg: "#c4efd6",
    iconColor: "#1f9d5f",
    color: "#1f7a4d",
    icon: "⚡",
    bgDark: "rgba(31,157,95,0.16)",
    iconBgDark: "rgba(31,157,95,0.28)",
    colorDark: "#6fe0ac",
  },
  bad: {
    bg: "#fff1f0",
    iconBg: "#fbdad9",
    iconColor: "#d5525d",
    color: "#b5555e",
    icon: "✕",
    bgDark: "rgba(225,92,103,0.16)",
    iconBgDark: "rgba(225,92,103,0.28)",
    colorDark: "#ff9da3",
  },
  warn: {
    bg: "#fff8e8",
    iconBg: "#ffedb0",
    iconColor: "#b08a1f",
    color: "#8a6412",
    icon: "◐",
    bgDark: "rgba(201,150,44,0.16)",
    iconBgDark: "rgba(201,150,44,0.28)",
    colorDark: "#e8c46a",
  },
  tip: {
    bg: "var(--card)",
    iconBg: "var(--icon-bg)",
    iconColor: "var(--accent)",
    color: "var(--muted)",
    icon: "☝",
    bgDark: "var(--card)",
    iconBgDark: "var(--icon-bg)",
    colorDark: "var(--muted)",
  },
};

/** Delta toast palette (points gained / lost). */
export const DELTA_POSITIVE = {
  bg: "#e3f9ec",
  color: "#1f9d5f",
  bgDark: "rgba(31,157,95,0.22)",
  colorDark: "#6fe0ac",
};
export const DELTA_NEGATIVE = {
  bg: "#fbdad9",
  color: "#d5525d",
  bgDark: "rgba(225,92,103,0.22)",
  colorDark: "#ff9da3",
};

/** Victory stat accents (fixed across themes). */
export const VICTORY_STATS = {
  points: { color: "#2fae76", bg: "#f3f9ff", bgDark: "rgba(47,174,118,0.12)" },
  penalty: { color: "#e15c67", bg: "#fff1f0", bgDark: "rgba(225,92,103,0.12)" },
  total: { color: "#c9962c", bg: "#fff6da", bgDark: "rgba(201,150,44,0.12)" },
};

/** Leaderboard podium medals. */
export const PODIUM_MEDALS = [
  { medalColor: "#d6a418", barColor: "#ffe9ad", barHeight: 84 },
  { medalColor: "#9aa9b8", barColor: "#e4e9f0", barHeight: 58 },
  { medalColor: "#c9772f", barColor: "#f7ddc4", barHeight: 40 },
];
