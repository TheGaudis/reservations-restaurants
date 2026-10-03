import { useSuspenseQuery } from "@tanstack/react-query";
import type { QueryFunction, QueryKey } from "@tanstack/react-query";

import type { FullState, PublicState } from "@/domain/types";
import {
  PUBLIC_STATE_CACHE,
  publicStateOptions,
  readFullState,
  readPublicState,
  STAFF_STATE_CACHE,
  stateKeys,
} from "@/queries/state";
import { useSessionStore } from "@/session/session";

/**
 * Start of this page load. The restored local copy is dated by its `savedAt`, so it alone is older: until a
 * read of the script succeeds, the page shows data from the cache (G-02).
 */
export const APP_START = Date.now();

/** State shown on the page: the public state, or the full state while a staff session is open (PLAN § 3.3). */
export type AppState = PublicState | FullState;

interface AppStateQuery {
  queryKey: QueryKey;
  queryFn: QueryFunction<AppState>;
  staleTime?: number;
  gcTime: number;
  retry?: false;
}

/** Public state, or the full state of the open session; never the full state of a closed one. */
function appStateQuery(password: string | null, id: number): AppStateQuery {
  if (password === null) {
    return { queryKey: stateKeys.public(), queryFn: readPublicState, ...PUBLIC_STATE_CACHE };
  }
  return { queryKey: stateKeys.staff(id), queryFn: readFullState(password), ...STAFF_STATE_CACHE };
}

/**
 * The state shown, through `select` (PLAN § 3.3.1, step 5). At login the full state is in the cache before the
 * session opens, and at logout the public state is still there (`gcTime: Infinity`): switching suspends nothing.
 */
export function useAppState<T>(select: (state: AppState) => T): T {
  const password = useSessionStore((session) => session.password);
  const id = useSessionStore((session) => session.id);
  return useSuspenseQuery({ ...appStateQuery(password, id), select }).data;
}

/**
 * The public state shown comes from the local copy and no read has succeeded yet (G-02): « Réserver » stays
 * active, the staff login is refused (PLAN § 3.3.1, step 5).
 */
export function useIsFromCache(): boolean {
  return useSuspenseQuery(publicStateOptions).dataUpdatedAt < APP_START;
}
