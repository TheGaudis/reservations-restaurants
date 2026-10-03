import { QueryClient } from "@tanstack/react-query";

import { retryRead } from "@/api/state";
import { READ_RETRY_DELAY_MS } from "@/domain/constants";

/** Query defaults of PLAN § 3.3 that do not depend on the session. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 180_000,
        // In the defaults, so that a test client can turn it off (PLAN § 3.3, R-18).
        retry: retryRead,
        retryDelay: READ_RETRY_DELAY_MS,
        refetchIntervalInBackground: false,
      },
      // A write is never replayed (02 § 1.5).
      mutations: { retry: false, networkMode: "always" },
    },
  });
}
