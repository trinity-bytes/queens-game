// Service worker for Queens 4 My Queen.
//
// Written by hand rather than generated: the app is a single-screen game whose
// whole runtime is client-side, so its caching needs are small enough to read
// in one sitting — and a plain file cannot stop working the next time the
// bundler changes underneath it.
//
// Bump CACHE on any change to this file. The activate handler deletes every
// cache that does not match, which is what actually retires the old one.
const CACHE = "queens-v2";

// Fixed-path assets worth holding before the first offline load. Hashed build
// output is deliberately absent: its names only exist at build time, so it is
// picked up by the runtime rules below instead.
const SHELL = [
  "/",
  "/manifest.json",
  "/favicon.ico",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Added one at a time on purpose: cache.addAll rejects the whole batch if
      // a single entry 404s, which would leave the worker permanently unable
      // to install over one stale filename.
      await Promise.allSettled(SHELL.map((path) => cache.add(path)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only GETs are cacheable, and only our own origin.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // The API shares this origin but must never be served from cache: a stale
  // leaderboard is worse than none, and polling would just re-read the copy.
  if (url.pathname.startsWith("/api/")) return;

  // React Server Component payloads are tied to the deployment that produced
  // them. Serving a stale one triggers a version-skew reload, so they always
  // go to the network.
  if (url.searchParams.has("_rsc")) return;

  // Navigations go network-first so a fresh deploy lands on the next online
  // load, instead of the app being pinned forever to the first HTML cached.
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  // Build output is content-addressed — the hash is in the filename, so a
  // cached copy can never be the wrong version and revalidating is pure waste.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Everything else: images, icons, the manifest. Stable paths with mutable
  // content, so serve what we have and refresh behind the user.
  event.respondWith(staleWhileRevalidate(event));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    // Offline: the page itself if we have it, otherwise the app shell, which
    // is the game anyway.
    const cached = (await cache.match(request)) ?? (await cache.match("/"));
    return cached ?? Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);

  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(event.request);

  const network = fetch(event.request)
    .then((response) => {
      if (response.ok) cache.put(event.request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) {
    // The response is already on its way back, so the worker has to be kept
    // alive explicitly or the refresh may be killed before it lands.
    event.waitUntil(network);
    return cached;
  }

  return (await network) ?? Response.error();
}
