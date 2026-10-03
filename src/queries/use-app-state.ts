import { useSuspenseQuery } from "@tanstack/react-query";
import type { QueryFunction, QueryKey } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

import type { FullState, PublicState } from "@/domain/types";
import {
  PUBLIC_STATE_CACHE,
  publicStateOptions,
  readFullState,
  readPublicState,
  STAFF_STATE_CACHE,
  stateKeys,
} from "@/queries/state";

/**
 * Start of this page load. The restored local copy is dated by its `savedAt`, so it alone is older: until a
 * read of the script succeeds, the page shows data from the cache (G-02).
 */
export const APP_START = Date.now();

/** State shown on the page: the public state, or the full state while a staff session is open (PLAN § 3.3). */
export type AppState = PublicState | FullState;

/** What these hooks read of the staff session: `password` and `id` of the session store (PLAN § 3.4). */
interface StaffSessionView {
  readonly password: string | null;
  readonly id: number;
}

/** The staff session store, or any store with the same `getState` and `subscribe` (a Zustand store fits). */
export interface StaffSessionSource {
  getState: () => StaffSessionView;
  subscribe: (listener: () => void) => () => void;
}

interface AppStateQuery {
  queryKey: QueryKey;
  queryFn: QueryFunction<AppState>;
  staleTime?: number;
  gcTime: number;
  retry?: false;
}

/** Public state, or the full state of the open session; never the full state of a closed one. */
function appStateQuery({ password, id }: StaffSessionView): AppStateQuery {
  if (password === null) {
    return { queryKey: stateKeys.public(), queryFn: readPublicState, ...PUBLIC_STATE_CACHE };
  }
  return { queryKey: stateKeys.staff(id), queryFn: readFullState(password), ...STAFF_STATE_CACHE };
}

/**
 * The state shown, through `select` (PLAN § 3.3.1, step 5). At login the full state is in the cache before the
 * session opens, and at logout the public state is still there (`gcTime: Infinity`): switching suspends nothing.
 */
export function useAppState<T>(session: StaffSessionSource, select: (state: AppState) => T): T {
  const view = useSyncExternalStore(session.subscribe, session.getState, session.getState);
  return useSuspenseQuery({ ...appStateQuery(view), select }).data;
}

/**
 * The public state shown comes from the local copy and no read has succeeded yet (G-02): « Réserver » stays
 * active, the staff login is refused (PLAN § 3.3.1, step 5).
 */
export function useIsFromCache(): boolean {
  return useSuspenseQuery(publicStateOptions).dataUpdatedAt < APP_START;
}
