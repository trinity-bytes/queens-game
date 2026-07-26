/** @type {import('next').NextConfig} */
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
);

// No PWA plugin here on purpose. next-pwa is a webpack plugin and Next 16
// builds with Turbopack, so it silently produced nothing; the service worker
// now lives in public/sw.js and is registered by ServiceWorkerRegistrar.
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  // Every leaderboard row is stamped with the app version. Injected here so
  // package.json stays the single place the number is written.
  env: { NEXT_PUBLIC_APP_VERSION: version },
};

export default nextConfig;
