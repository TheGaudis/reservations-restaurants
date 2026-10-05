import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

import type { useSessionStore } from "@/session/session";

interface RouterContext {
  queryClient: QueryClient;
  session: typeof useSessionStore;
}

export const Route = createRootRouteWithContext<RouterContext>()({ component: Outlet });
