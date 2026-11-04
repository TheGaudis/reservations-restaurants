import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useRef } from "react";

import { Header, HeaderMode } from "@/features/page/Header";
import { ModeSwitch } from "@/features/page/ModeSwitch";
import { PageLayout } from "@/features/page/PageLayout";
import { AutoRefresh } from "@/queries/AutoRefresh";
import type { SessionStore } from "@/session/session";
import { Toaster } from "@/ui/feedback/Toaster";

interface RouterContext {
  queryClient: QueryClient;
  /** Staff session store (PLAN § 3.4): the /collegue guard reads it, tests pass a fresh one. */
  session: SessionStore;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: AppRoot,
});

// Frame of every page (08 § 7.1), mounted once: the pending, error and content states of a route, and the move from /
// to /collegue, change only what `<Outlet />` renders. The header, the logo and « Client / Collègue » stay the same
// elements (03 § 2.3, § 5.4); `AutoRefresh` is the only refresh, for every route (PLAN § 3.3.2). Before the first
// render, #root holds the static skeleton of index.html: the same frame without the switch.
// `.app-root` is the stacking context of the app: Base UI portals, appended to <body>, stay above it (PLAN § 3.6).
// Toasts of every page (G-07) render in an element of their own after it, inside the container of a route test.
function AppRoot() {
  const toasts = useRef<HTMLDivElement>(null);
  return (
    <>
      <div className="app-root">
        <PageLayout>
          <Header>
            <HeaderMode>
              <ModeSwitch />
            </HeaderMode>
          </Header>
          <Outlet />
        </PageLayout>
      </div>
      <div ref={toasts} />
      <Toaster container={toasts} />
      <AutoRefresh />
      {/* Both render nothing in a production build (PLAN § 2). */}
      <TanStackRouterDevtools />
      <ReactQueryDevtools />
    </>
  );
}
