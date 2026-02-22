const STORAGE_KEY = "queens_nicks";
const MAX_NICKS = 10;

/**
 * Retrieves saved nicknames from localStorage, ordered by most recent first.
 * Returns an empty array if nothing is stored or localStorage is unavailable.
 */
export function getSavedNicks(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n): n is string => typeof n === "string");
  } catch {
    return [];
  }
}

/**
 * Saves a nickname to localStorage. Moves it to the front if it already exists
 * (most-recently-used order). Keeps at most MAX_NICKS entries.
 */
export function saveNick(nick: string): void {
  try {
    const trimmed = nick.trim();
    if (!trimmed) return;
    const nicks = getSavedNicks().filter(
      (n) => n.toLowerCase() !== trimmed.toLowerCase(),
    );
    nicks.unshift(trimmed);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(nicks.slice(0, MAX_NICKS)),
    );
  } catch {
    // localStorage unavailable (e.g. private browsing)
  }
}
