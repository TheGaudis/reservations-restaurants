// A tab opened before a deployment asks for a chunk that no longer exists (Pages answers with the 404 page): Vite
// fires `vite:preloadError` for the failed `import()`. The page reloads once to get the new chunks (R-06,
// PLAN § 3.9). The guard in sessionStorage holds only a time, never a personal data (invariant 1).

const GUARD_KEY = "reservations-preload-reload";

/** A second failure within this delay after a reload is a real error: no reload loop. */
const RELOAD_GUARD_MS = 60_000;

interface ReloadDeps {
  storage: Pick<Storage, "getItem" | "setItem">;
  reload: () => void;
  now: number;
}

/**
 * Reloads the page unless it already did so less than a minute ago. Returns true when it reloads: the caller then
 * stops the error (`preventDefault`), the new page loads the chunk.
 * @internal exported for the tests
 */
export function reloadOnce({ storage, reload, now }: ReloadDeps): boolean {
  try {
    const last = storage.getItem(GUARD_KEY);
    if (last !== null && now - Number(last) < RELOAD_GUARD_MS) return false;
    storage.setItem(GUARD_KEY, String(now));
  } catch {
    // Blocked storage: no guard, no reload; the error reaches the router like any other.
    return false;
  }
  reload();
  return true;
}

function onPreloadError(event: Event): void {
  const reloading = reloadOnce({
    storage: sessionStorage,
    reload: () => {
      window.location.reload();
    },
    now: Date.now(),
  });
  if (reloading) event.preventDefault();
}

/** Listens once for the whole page: the same listener added again by a new `getRouter()` is ignored. */
export function listenPreloadError(): void {
  window.addEventListener("vite:preloadError", onPreloadError);
}
