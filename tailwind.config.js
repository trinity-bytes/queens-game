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
          surface: "var(--theme-surface)",
          text: "var(--theme-text)",
          accent: "var(--theme-accent)",
          pattern: "var(--theme-pattern)",
        },
        ink: "var(--ink)",
        muted: "var(--muted)",
        card: "var(--card)",
        accent: "var(--accent)",
        "icon-bg": "var(--icon-bg)",
        "chip-bg": "var(--chip-bg)",
        "chip-label": "var(--chip-label)",
        "score-bg": "var(--score-bg)",
        "score-label": "var(--score-label)",
        "score-text": "var(--score-text)",
      },
      borderRadius: {
        "3xl": "1.5rem",
        "4xl": "1.75rem",
      },
    },
  },
  plugins: [],
};
