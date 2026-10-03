import { createFileRoute } from "@tanstack/react-router";

import { PublicPage } from "@/features/page/PublicPage";
import type { ShellState } from "@/queries/local-cache";
import { stateKeys } from "@/queries/state";

export const Route = createFileRoute("/")({
  // With the local copy the loader resolves at once; the prerendered skeleton still stays for pendingMinMs
  // (default 500 ms). Never set it to 0 alone: React error #418 on hydration (PLAN arbitrage 16).
  loader: ({ context: { queryClient } }) =>
    queryClient.getQueryData<ShellState>(stateKeys.public()) ?? null,
  pendingMs: 0,
  component: PublicPage,
});
