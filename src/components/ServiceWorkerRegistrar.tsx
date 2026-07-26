"use client";

import { useEffect } from "react";

/**
 * Registers the service worker that ships in `public/sw.js`.
 *
 * Development is deliberately excluded: a worker caching assets in front of
 * hot reload turns every refresh into a coin flip on which build you are
 * looking at. To exercise it, run a production build and `npm start`.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  }, []);

  return null;
}
