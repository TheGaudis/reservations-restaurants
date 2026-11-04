import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { RawIntlProvider } from "react-intl";

import { PageSkeleton } from "@/features/page/PageSkeleton";
import { intl } from "@/intl/intl";
import { createQueryClient } from "@/queries/client";
import { restoreLocalCache } from "@/queries/local-cache";
import { routeTree } from "@/routeTree.gen";
import { useSessionStore } from "@/session/session";

export function getRouter() {
  const queryClient = createQueryClient();
  const inBrowser = typeof window !== "undefined"; // getRouter() also runs in Node when the shell is prerendered
  if (inBrowser) {
    restoreLocalCache(queryClient); // SYNCHRONOUS, before the router
  }
  const router = createRouter({
    routeTree,
    context: { queryClient, session: useSessionStore },
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    defaultPendingComponent: PageSkeleton,
    ...(import.meta.env.VITE_SPIKE_VARIANT?.startsWith("pmin") === true
      ? { defaultPendingMinMs: Number(import.meta.env.VITE_SPIKE_VARIANT.slice(4)) }
      : {}),
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <RawIntlProvider value={intl}>{children}</RawIntlProvider>
      </QueryClientProvider>
    ),
  });
  if (inBrowser) {
    useSessionStore.subscribe(
      (s) => s.password !== null,
      (loggedIn) => {
        if (!loggedIn) queryClient.removeQueries({ queryKey: ["state", "staff"] });
      },
    );
  }
  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
