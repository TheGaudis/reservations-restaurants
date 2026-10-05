import { useQuery } from "@tanstack/react-query";

import { REFRESH_INTERVAL_MS } from "@/domain/constants";
import { useAppStateQuery } from "@/queries/use-app-state";

/**
 * The only observer that refreshes the state shown every 3 minutes (PLAN § 3.3.2, R-18): mounted once by the root,
 * one timer for every route.
 * It refreshes the full state while a staff session is open (06 § 1.8). The refresh goes on under an open form
 * (E-08), pauses while the tab is hidden and catches up when it comes back or the network returns (03 § 5.1).
 * Mounted on a failed first read, it does not read again at once: the next read comes from the timer, the tab or
 * « Réessayer » (03 § 3.2).
 */
export function AutoRefresh() {
  useQuery({
    ...useAppStateQuery(),
    refetchInterval: REFRESH_INTERVAL_MS,
    retryOnMount: false,
    // Renders nothing: no state of the query concerns it.
    notifyOnChangeProps: [],
  });
  return null;
}
