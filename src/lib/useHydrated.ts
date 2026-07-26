import { useSyncExternalStore } from "react";

// Nothing ever changes, so a subscriber is never notified — React still
// requires a valid unsubscribe callback.
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * True only once the client has hydrated.
 *
 * Guards anything the prerender cannot know — localStorage, matchMedia, the
 * wall clock — so the first client render still matches the HTML that shipped,
 * and the real value lands on the pass right after.
 *
 * This is the usual `mounted` flag without the effect: React serves the server
 * snapshot through hydration and schedules its own re-render when the client
 * snapshot disagrees, instead of a setState cascading out of an effect body.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
