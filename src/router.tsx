import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { RawIntlProvider } from "react-intl";

import { PageSkeleton } from "@/features/page/PageSkeleton";
import { intl } from "@/intl/intl";
import { createQueryClient } from "@/queries/client";
import { persistLocalCache, restoreLocalCache } from "@/queries/local-cache";
import { routeTree } from "@/routeTree.gen";
import { useSessionStore } from "@/session/session";

export function getRouter() {
  // The script refused the password of the open session: it changed (06 § 1.7, PLAN § 3.3.4).
  const queryClient = createQueryClient({
    onPasswordRejected: () => {
      useSessionStore.getState().close("password-changed");
    },
  });
  // getRouter() also runs in Node when the shell is prerendered (R-02).
  if (typeof window !== "undefined") {
    restoreLocalCache(queryClient, Date.now()); // synchronous, before the router (PLAN § 3.3.1)
    persistLocalCache(queryClient); // after the restore, which must write nothing (03 § 1.1)
  }
  return createRouter({
    routeTree,
    context: { queryClient, session: useSessionStore },
    defaultPreloadStaleTime: 0, // Query owns freshness
    defaultStructuralSharing: true,
    scrollRestoration: true,
    defaultPendingComponent: PageSkeleton,
    // defaultPendingMinMs keeps its default (500 ms): 0 triggers React error #418 on hydration (PLAN arbitrage 16)
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <RawIntlProvider value={intl}>{children}</RawIntlProvider>
      </QueryClientProvider>
    ),
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
