import { createFileRoute } from "@tanstack/react-router";

import type { PublicState } from "@/domain/types";
import { PublicPage } from "@/features/page/PublicPage";
import { publicStateOptions } from "@/queries/state";

export const Route = createFileRoute("/")({
  // With the local copy the loader resolves at once and the content replaces the prerendered skeleton as soon as
  // hydration ends. pendingMinMs: 0 is safe only because PublicPage renders exactly PageSkeleton while hydrating
  // (useHydrated); without that barrier it triggers React error #418 (PLAN § 2.1, arbitrage 16).
  loader: ({ context: { queryClient } }): PublicState | null =>
    queryClient.getQueryData(publicStateOptions.queryKey) ?? null,
  pendingMs: 0,
  pendingMinMs: 0,
  component: PublicPage,
});
