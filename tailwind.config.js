/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-baloo)', '"Baloo 2"', "sans-serif"],
        sans: ['var(--font-nunito)', '"Nunito"', "system-ui", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        theme: {
          bg: "var(--theme-bg)",
          text: "var(--theme-text)",
        },
        ink: "var(--ink)",
        muted: "var(--muted)",
        card: "var(--card)",
        accent: "var(--accent)",
        "icon-bg": "var(--icon-bg)",
        "chip-bg": "var(--chip-bg)",
        "chip-label": "var(--chip-label)",
        "stat-points": "var(--stat-points)",
        "stat-penalty": "var(--stat-penalty)",
        "stat-total": "var(--stat-total)",
        "badge-flawless": "var(--badge-flawless)",
        "badge-flawless-bg": "var(--badge-flawless-bg)",
        "badge-errors": "var(--badge-errors)",
        "badge-errors-bg": "var(--badge-errors-bg)",
      },
      // The type scale is 44, 24, 20, 16, 14, 12 and 11: text-display, text-2xl,
      // text-xl, text-base, text-sm, text-xs and text-micro.
      fontSize: {
        display: ["44px", { lineHeight: "1.1" }],
        micro: ["11px", { lineHeight: "1.3" }],
      },
      borderRadius: {
        "3xl": "1.5rem",
        "4xl": "1.75rem",
      },
    },
  },
  plugins: [],
};
