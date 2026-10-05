import type { QueryClient } from "@tanstack/react-query";

import { stateKeys } from "@/queries/state";

/**
 * Step 2 of the logout (PLAN § 3.3.4, invariant 1, a-1): every full state leaves the cache, a read in flight
 * included, and so do the variables of past writes, which hold names and contacts. Synchronous: nothing personal
 * is left once it returns. The public state stays (`gcTime: Infinity`).
 */
export function purgeStaffSession(queryClient: QueryClient): void {
  void queryClient.cancelQueries({ queryKey: stateKeys.staffAll() });
  queryClient.removeQueries({ queryKey: stateKeys.staffAll() });
  queryClient.getMutationCache().clear();
}
