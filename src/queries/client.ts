import { QueryClient } from "@tanstack/react-query";

/** Query defaults of PLAN § 3.3 that do not depend on api/ (errors, session). */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 180_000,
        retryDelay: 1500,
        refetchIntervalInBackground: false,
      },
      // A write is never replayed (02 § 1.5).
      mutations: { retry: false, networkMode: "always" },
    },
  });
}
