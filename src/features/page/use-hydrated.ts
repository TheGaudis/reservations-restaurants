import { useSyncExternalStore } from "react";

// The value only differs between the server snapshot and the client snapshot: nothing to subscribe to.
function subscribe(): () => void {
  return () => {
    // Nothing to unsubscribe.
  };
}

/**
 * Client-only barrier (PLAN § 2.1, arbitrage 16): false while React hydrates the prerendered shell, true on every
 * client render after it. A route that renders exactly its pending component while this is false hydrates without
 * React error #418, which allows pendingMinMs: 0 on that route.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
