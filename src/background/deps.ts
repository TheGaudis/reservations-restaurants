// What the background tasks receive from `getRouter()` (PLAN § 3.4, § 3.11).
import type { QueryClient } from "@tanstack/react-query";
import type { AnyRouter } from "@tanstack/react-router";
import * as v from "valibot";

import type { SessionStore } from "@/session/session";

/** Toast kinds of PLAN § 3.5 (`ui/feedback/toast.ts`). */
export type ToastType = "success" | "neutral" | "error";

export interface BackgroundDeps {
  queryClient: QueryClient;
  router: AnyRouter;
  session: SessionStore;
  /** `queries/purge.ts` (PLAN § 3.3.4, step 2): staff state and mutation variables out of the cache. */
  purgeStaffSession: (queryClient: QueryClient) => void;
  /** `ui/feedback/toast.ts`: callable outside React. */
  showToast: (message: string, type: ToastType) => void;
}

const SearchRecord = v.record(v.string(), v.unknown());

/** Search params of the current URL. Background tasks run outside any route: they get them unvalidated. */
export function currentSearch(router: AnyRouter): Record<string, unknown> {
  return v.parse(SearchRecord, router.state.location.search);
}
