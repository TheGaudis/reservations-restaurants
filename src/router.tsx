import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { RawIntlProvider } from "react-intl";

import { listenPreloadError } from "@/background/preload-error";
import { startBackgroundTasks } from "@/background/start";
import { isConfigMissing } from "@/config";
import { startViewTransition } from "@/features/calendar/view-transition";
import { LoadErrorPage } from "@/features/page/LoadErrorPage";
import { PageSkeleton } from "@/features/page/PageSkeleton";
import { intl } from "@/intl/intl";
import { createQueryClient } from "@/queries/client";
import { persistLocalCache, restoreLocalCache } from "@/queries/local-cache";
import { purgeStaffSession } from "@/queries/purge";
import { routeTree } from "@/routeTree.gen";
import { useSessionStore } from "@/session/session";
import { showToast } from "@/ui/feedback/toast";

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
    listenPreloadError(); // stale chunk after a deployment (R-06)
    // G-05, D-05: the banner tells the visitors; the person in charge finds the variable here and in the README.
    if (isConfigMissing()) {
      console.warn("VITE_APPS_SCRIPT_URL manque ou n'est pas une adresse /exec d'Apps Script.");
    }
  }
  const router = createRouter({
    routeTree,
    context: { queryClient, session: useSessionStore },
    defaultPreloadStaleTime: 0, // Query owns freshness
    defaultStructuralSharing: true,
    scrollRestoration: true,
    defaultPendingComponent: PageSkeleton,
    defaultErrorComponent: LoadErrorPage,
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <RawIntlProvider value={intl}>{children}</RawIntlProvider>
      </QueryClientProvider>
    ),
  });
  if (typeof window !== "undefined") {
    // Calendar transitions (05 § 3.4): a skipped one never ends in an unhandled rejection. Like the router, the
    // transition asked for applies to one load only: back and forward navigate without one.
    router.startViewTransition = async (update: () => Promise<void>) => {
      const transition = router.shouldViewTransition;
      router.shouldViewTransition = false;
      return startViewTransition(update, transition);
    };
    // Clock (today, 10:00, midnight), inactivity and logout steps (PLAN § 3.4, § 3.3.4); idempotent (R-25).
    startBackgroundTasks({
      queryClient,
      router,
      session: useSessionStore,
      purgeStaffSession,
      showToast,
    });
  }
  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
