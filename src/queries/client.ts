import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { PasswordRejectedError } from "@/api/errors";
import { retryRead } from "@/api/state";
import { READ_RETRY_DELAY_MS, REFRESH_INTERVAL_MS } from "@/domain/constants";

interface QueryClientOptions {
  /**
   * Called when the script refuses the password of a read or a write (02 § 2, 06 § 1.7): `getRouter()` closes the
   * staff session with `password-changed` (PLAN § 3.3). A refused login also lands here, while no session is open:
   * `close` then does nothing.
   */
  onPasswordRejected?: () => void;
}

/** Query defaults of PLAN § 3.3. */
export function createQueryClient({ onPasswordRejected }: QueryClientOptions = {}): QueryClient {
  const onError = (error: unknown) => {
    if (error instanceof PasswordRejectedError) onPasswordRejected?.();
  };
  return new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        staleTime: REFRESH_INTERVAL_MS,
        // In the defaults, so that a test client can turn it off (PLAN § 3.3, R-18).
        retry: retryRead,
        retryDelay: READ_RETRY_DELAY_MS,
        refetchIntervalInBackground: false,
      },
      // A write is never replayed, nor paused offline: it fails at once, and the form keeps its requestId for
      // the next attempt (02 § 1.5, R-11).
      mutations: { retry: false, networkMode: "always" },
    },
  });
}
