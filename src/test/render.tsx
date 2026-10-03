import type { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { render } from "vitest-browser-react";

import { createQueryClient } from "@/queries/client";
import { getRouter } from "@/router";
import { TestProviders } from "@/test/providers";
import type { Accent } from "@/test/providers";

// Styles of the shell (routes/__root.tsx): tokens, base rules, print rules.
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/print.css";

interface RenderOptions {
  /** Restaurant accent of the container; none: blue. */
  accent?: Accent;
  /** Defaults to a new client: no cache leaks from a test to the next (PLAN § 3.10, « Tests »). */
  queryClient?: QueryClient;
}

/**
 * Renders a component with the providers of the app (Query, react-intl, app container). Asynchronous, like
 * `render` of vitest-browser-react 2: await it before querying the screen.
 */
export async function renderWithProviders(ui: ReactNode, options: RenderOptions = {}) {
  const queryClient = options.queryClient ?? createQueryClient();
  const screen = await render(
    <TestProviders queryClient={queryClient} accent={options.accent}>
      {ui}
    </TestProviders>,
  );
  return { screen, queryClient };
}

/** Renders the whole app at `url` (path and search) with a memory history: routes, loaders and the router's `Wrap`. */
export async function renderRoute(url: string) {
  const router = getRouter();
  router.update({ ...router.options, history: createMemoryHistory({ initialEntries: [url] }) });
  const screen = await render(<RouterProvider router={router} />);
  return { router, screen, queryClient: router.options.context.queryClient };
}
