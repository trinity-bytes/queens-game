/** @type {import('next').NextConfig} */
import { readFileSync } from 'node:fs';
import withPWAInit from 'next-pwa';

const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
);

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  // Every leaderboard row is stamped with the app version. Injected here so
  // package.json stays the single place the number is written.
  env: { NEXT_PUBLIC_APP_VERSION: version },
};

export default withPWA(nextConfig);
