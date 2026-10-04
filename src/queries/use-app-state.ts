import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
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
 * @internal exported for the tests
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
 * Query of the state shown, for the session of the moment: the source that `useAppState` reads and that
 * `AutoRefresh` refreshes (PLAN § 3.3.2).
 */
export function useAppStateQuery(): AppStateQuery {
  const password = useSessionStore((session) => session.password);
  const id = useSessionStore((session) => session.id);
  return appStateQuery(password, id);
}

/**
 * The state shown, through `select` (PLAN § 3.3.1, step 5). At login the full state is in the cache before the
 * session opens, and at logout the public state is still there (`gcTime: Infinity`): switching suspends nothing.
 * A component that mounts later never reads the script itself: `AutoRefresh` alone schedules the reads.
 */
export function useAppState<T>(select: (state: AppState) => T): T {
  return useSuspenseQuery({ ...useAppStateQuery(), select, refetchOnMount: false }).data;
}

/**
 * The state shown through `select`, or `undefined` while there is none yet (skeleton, failed first read). Never
 * suspends, never reads the script: for the parts of the page drawn with or without data (titles, columns).
 */
export function useLoadedAppState<T>(select: (state: AppState) => T): T | undefined {
  return useQuery({ ...useAppStateQuery(), select, enabled: false }).data;
}

/**
 * The public state shown comes from the local copy and no read has succeeded yet (G-02): « Réserver » stays
 * active, the staff login is refused (PLAN § 3.3.1, step 5). False before any data. Never suspends, never reads
 * the script: the mode switch of the header renders it with or without data.
 */
export function useIsFromCache(): boolean {
  return usePublicReadStatus().fromCache;
}

/** Reads of the public state during this page load, for the load error box (G-03, 03 § 3). */
export interface PublicReadStatus {
  /** The last read failed and none has succeeded since the page loaded: later failures stay silent (03 § 5.2). */
  failed: boolean;
  /** The page shows the local copy of the last visit (suffix of 03 § 3.1). */
  fromCache: boolean;
  /** Reads the script again, with the single new attempt of reads (« Réessayer », 03 § 3.2). */
  retry: () => Promise<unknown>;
}

export function usePublicReadStatus(): PublicReadStatus {
  const { data, dataUpdatedAt, errorUpdatedAt, refetch } = useQuery({
    ...publicStateOptions,
    enabled: false,
    select: () => true,
  });
  const noReadYet = dataUpdatedAt < APP_START;
  // Not `isError`: without data, TanStack Query puts the query back to `pending` while it reads again, and the box
  // must stay (and not be announced again) during a new attempt (03 § 3.2, E-42).
  const failed = noReadYet && errorUpdatedAt > dataUpdatedAt;
  return { failed, fromCache: data === true && noReadYet, retry: refetch };
}
