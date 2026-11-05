/** @type {import('next').NextConfig} */
import { readFileSync } from 'node:fs';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
);

// No PWA plugin here on purpose. next-pwa is a webpack plugin and Next 16
// builds with Turbopack, so it silently produced nothing; the service worker
// now lives in public/sw.js and is registered by ServiceWorkerRegistrar.
const baseConfig = {
  reactStrictMode: true,
  turbopack: {},
  // Every leaderboard row is stamped with the app version. Injected here so
  // package.json stays the single place the number is written.
  env: { NEXT_PUBLIC_APP_VERSION: version },
};

export default function nextConfig(phase) {
  // `next dev` has no Worker behind it, so /api goes to `npm run dev:api`.
  // Rewrites do not exist in a static export, hence the split by phase.
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    return {
      ...baseConfig,
      rewrites: async () => [
        { source: '/api/:path*', destination: 'http://localhost:8787/api/:path*' },
      ],
    };
  }

  // The whole app is client-side, so production is plain files in out/, served
  // by the Worker's asset store (see wrangler.jsonc).
  return { ...baseConfig, output: 'export' };
}
