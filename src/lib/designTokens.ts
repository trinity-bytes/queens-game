/**
 * Theme-independent design constants from the Queens redesign.
 *
 * The board region colors are the SAME candy pastels across every theme —
 * only the surrounding chrome (page bg, chips, header, CTA, mascot) is tinted
 * per theme via CSS variables.
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

/** Leaderboard podium medals. */
export const PODIUM_MEDALS = [
  { medalColor: "#d6a418", barColor: "#ffe9ad", barHeight: 84 },
  { medalColor: "#9aa9b8", barColor: "#e4e9f0", barHeight: 58 },
  { medalColor: "#c9772f", barColor: "#f7ddc4", barHeight: 40 },
];
