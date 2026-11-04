import { QueryClient } from "@tanstack/react-query";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 180_000,
        retry: 1,
        retryDelay: 1500,
        refetchIntervalInBackground: false,
      },
      mutations: { retry: false, networkMode: "always" },
    },
  });
}
