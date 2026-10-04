import { queryOptions } from "@tanstack/react-query";
import type { QueryFunctionContext } from "@tanstack/react-query";

import { ServiceError } from "@/api/errors";
import { fetchFullState, fetchPublicState } from "@/api/state";
import { REFRESH_INTERVAL_MS } from "@/domain/constants";
import type { FullState, PublicState } from "@/domain/types";

// Script state in TanStack Query (PLAN § 3.3). Never a password nor a hash of it in a key: the staff state is keyed
// by the session number only.

/** Query keys of the script state (PLAN § 3.3). */
export const stateKeys = {
  all: () => ["state"] as const,
  public: () => ["state", "public"] as const,
  /** Every staff state, whatever the session: what the logout purges (PLAN § 3.3.4). */
  staffAll: () => ["state", "staff"] as const,
  staff: (id: number) => ["state", "staff", id] as const,
};

/**
 * Cache settings of the public state (PLAN § 3.3): fresh for 3 minutes, like the automatic refresh; kept in memory
 * for the whole visit, the fallback shown at once after a logout (a-1).
 */
export const PUBLIC_STATE_CACHE = {
  staleTime: REFRESH_INTERVAL_MS,
  gcTime: Number.POSITIVE_INFINITY,
};

/**
 * Cache settings of the full state (PLAN § 3.3): out of the cache as soon as nothing observes it (invariant 1).
 * `getAdminState` is a POST, never retried (02 § 1.5).
 */
export const STAFF_STATE_CACHE = { gcTime: 0, retry: false } as const;

/**
 * Reads the public state with the etag of the state already shown (02 § 3.3, § 5.1). `{ unchanged }` keeps the
 * same reference, so nothing renders again and only `dataUpdatedAt` moves.
 */
export async function readPublicState({
  client,
  queryKey,
  signal,
}: QueryFunctionContext): Promise<PublicState> {
  const previous = client.getQueryData<PublicState>(queryKey);
  const response = await fetchPublicState({ since: previous?.etag ?? "", signal });
  if (response.type === "state") return response.state;
  if (previous !== undefined) return previous;
  // The script answers `unchanged` only to a `since`, and `since` comes from `previous`: a query never resolves to
  // undefined (R-18).
  throw new ServiceError("The script answered unchanged to a read without since.");
}

/** Reads the full state with the password of the session (02 § 4.3); the password stays out of the key. */
export function readFullState(password: string) {
  return async ({ signal }: QueryFunctionContext): Promise<FullState> =>
    fetchFullState(password, signal);
}

/** Public state (02 § 3.2), the only one written to the local copy (PLAN § 3.3.5). */
export const publicStateOptions = queryOptions({
  queryKey: stateKeys.public(),
  queryFn: readPublicState,
  ...PUBLIC_STATE_CACHE,
});

/**
 * Full state of staff session `id` (02 § 4.3). The session opens with a new `id` and a new password together
 * (PLAN § 3.4): a key never serves two passwords.
 * @public used by the login from P5 (a)
 */
export function staffStateOptions(id: number, password: string) {
  return queryOptions({
    queryKey: stateKeys.staff(id),
    queryFn: readFullState(password),
    ...STAFF_STATE_CACHE,
  });
}
