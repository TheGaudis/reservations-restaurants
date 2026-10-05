import { QueryClientProvider } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { RawIntlProvider } from "react-intl";

import { intl } from "@/intl/intl";

/** Restaurant accent of a container (docs/spec/08 § 2); without it, the blue of the header and top panels. */
export type Accent = "r1" | "r2";

interface TestProvidersProps {
  queryClient: QueryClient;
  accent?: Accent | undefined;
  children: ReactNode;
}

/**
 * Providers of the router's `Wrap` (PLAN § 3.11) and the app container of `__root.tsx`, around a component under
 * test (`render.tsx`) or a story (`.storybook/preview.tsx`). Portals render outside it, without the accent.
 */
export function TestProviders({ queryClient, accent, children }: TestProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <RawIntlProvider value={intl}>
        <div className="app-root" data-accent={accent}>
          {children}
        </div>
      </RawIntlProvider>
    </QueryClientProvider>
  );
}
