import type { QueryClient } from "@tanstack/react-query";

import { publicStateOptions } from "@/queries/state";
import { usePublicReadStatus } from "@/queries/use-app-state";

// First read of the public state (03 § 2.4, § 3; PLAN § 3.3.1, § 3.9): the loader of / waits for it, the page throws
// its failure to the error component of the route (G-03), which gives the page back once a later read succeeds.

/** The first read failed and no read has succeeded since: no state to show (G-03). `cause`: the read's error. */
export class FirstReadError extends Error {
  override name = "FirstReadError";
}

/**
 * Loader of /: waits for the first read of this page load, started here or by `AutoRefresh` (one request, the early
 * fetch of the <head>). Nothing to wait for with the local copy, nor once the first read is over: later reads belong
 * to `AutoRefresh` and « Réessayer » (03 § 3.2, § 5.2). Never rejects: the route stays loaded, so a navigation does
 * not run the loader again; the page throws the failure instead (`useFirstReadOrThrow`).
 */
export async function waitForFirstRead(queryClient: QueryClient): Promise<void> {
  const state = queryClient.getQueryState(publicStateOptions.queryKey);
  if (state?.data !== undefined || state?.status === "error") return;
  try {
    await queryClient.query(publicStateOptions);
  } catch {
    // The failure stays in the query.
  }
}

/**
 * Page of /: throws a `FirstReadError` while there is no state after a failed read, also during a new attempt, so the
 * error component of the route stays (03 § 3.2). Reads nothing: the query observer is disabled.
 */
export function useFirstReadOrThrow(): void {
  const { loaded, failed, error } = usePublicReadStatus();
  if (!loaded && failed) {
    throw new FirstReadError("The first read of the public state failed.", { cause: error });
  }
}

/**
 * `onCaughtError` of the React root (client.tsx): the error component of / shows a `FirstReadError` (G-03), so the
 * console does not; React logs every other error an error boundary catches. A hydration error goes through
 * `onRecoverableError`, left untouched (arbitrage 16).
 */
export function logCaughtError(
  error: unknown,
  errorInfo: { componentStack?: string | undefined },
): void {
  if (error instanceof FirstReadError) return;
  console.error(error, errorInfo.componentStack);
}
