import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RawIntlProvider } from "react-intl";

import { PageSkeleton } from "@/features/page/PageSkeleton";
import { intl } from "@/intl/intl";
import { createQueryClient } from "@/queries/client";
import { restoreLocalCache } from "@/queries/local-cache";
import { useSessionStore } from "@/session/session";

import "@/styles/base.css";

import { routeTree } from "./routeTree.gen";

const queryClient = createQueryClient();
restoreLocalCache(queryClient);
const router = createRouter({
  routeTree,
  basepath: import.meta.env.BASE_URL,
  context: { queryClient, session: useSessionStore },
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  defaultPendingComponent: PageSkeleton,
  defaultPendingMinMs: 0,
  Wrap: ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <RawIntlProvider value={intl}>{children}</RawIntlProvider>
    </QueryClientProvider>
  ),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}
