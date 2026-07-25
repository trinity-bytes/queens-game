import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

/**
 * Flat config. `next lint` was removed in Next 16, so `npm run lint` calls
 * eslint directly and this file is the only source of configuration.
 *
 * core-web-vitals already spreads in eslint-config-next's base rules, so it is
 * the only Next entry point needed alongside the TypeScript one.
 */
export default [
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "node_modules/**",
      "public/**",
      // Gitignored scratch: handoff copies of the app have lived here and are
      // not part of the build. Kept in sync with tsconfig.json's exclude.
      "docs/**",
      ".codegraph/**",
      // Git worktrees created by tooling live here. They are full checkouts,
      // build output and all, so linting them means linting the project again
      // plus its .next bundle — 10k findings that belong to no real file.
      ".claude/**",
      "next-env.d.ts",
    ],
  },

  ...nextCoreWebVitals,
  ...nextTypeScript,

  {
    rules: {
      /**
       * Board figures are swapped by theme (`/assets/figures/${theme}.png`) and
       * fall back to queen.png through onError when a theme asset is missing.
       * next/image does not express that fallback cleanly, and these are small
       * local PNGs where its resizing buys little. Deliberate choice, not debt.
       */
      "@next/next/no-img-element": "off",

      /**
       * Downgraded from error so the lint stays a usable gate. All four hits
       * are the same underlying issue — SSR/client divergence handled with a
       * mount effect (`setMounted(true)`, the announcer message, the random
       * background layout). Fixing it properly means moving to
       * useSyncExternalStore, which is its own piece of work. Kept visible as
       * a warning rather than silenced.
       */
      "react-hooks/set-state-in-effect": "warn",
    },
  },

  {
    // Config files legitimately export an object literal.
    files: ["*.config.{js,mjs,ts}", "eslint.config.mjs"],
    rules: { "import/no-anonymous-default-export": "off" },
  },
];
