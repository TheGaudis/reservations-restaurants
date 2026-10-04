import type { QueryClient } from "@tanstack/react-query";
import { createFileRoute, retainSearchParams, stripSearchParams } from "@tanstack/react-router";
import * as v from "valibot";

import { CALENDAR_KEYS } from "@/domain/navigation";
import { CALENDAR_DEFAULTS, CalendarSearch } from "@/features/calendar/search";
import { PageSkeleton } from "@/features/page/PageSkeleton";
import { PublicPage } from "@/features/page/PublicPage";
import { publicStateOptions } from "@/queries/state";

// Public page (PLAN § 3.2, 09 § 1). `?connexion=1` is a number and falls back to false: links write `true`.
const HomeSearch = v.object({
  ...CalendarSearch.entries,
  reserver: v.fallback(v.optional(v.picklist(["r1", "r2"])), undefined),
  connexion: v.fallback(v.optional(v.boolean(), false), false),
  retour: v.fallback(v.optional(v.pipe(v.string(), v.startsWith("/collegue"))), undefined),
});

/**
 * The first read of this page load (03 § 2.4): started here, or taken from `AutoRefresh` when it started it first; it
 * reuses the early fetch of the <head>. Nothing to wait for with the local copy, nor once the first read is over: later
 * reads belong to `AutoRefresh` and « Réessayer » (03 § 3.2, § 5.2).
 */
async function firstRead(queryClient: QueryClient): Promise<void> {
  const state = queryClient.getQueryState(publicStateOptions.queryKey);
  if (state?.data !== undefined || state?.status === "error") return;
  try {
    await queryClient.query(publicStateOptions);
  } catch {
    // The failure stays in the query: the page shows the load error box (G-03).
  }
}

export const Route = createFileRoute("/")({
  validateSearch: HomeSearch,
  search: {
    // Strip runs last (outer middleware): a retained default (`r1vue=semaine`) leaves the URL too.
    middlewares: [
      stripSearchParams({ ...CALENDAR_DEFAULTS, connexion: false }),
      retainSearchParams(CALENDAR_KEYS),
    ],
  },
  // Waits for the first read without a local copy: the skeleton until it answers or fails (G-01, G-03); with the copy,
  // the page shows it at once (G-02, PLAN § 3.3.1).
  loader: async ({ context: { queryClient } }) => {
    await firstRead(queryClient);
  },
  // The root renders the routes in `BrowserOnly`: React never hydrates them, so no pending delay is needed to keep the
  // prerendered shell (arbitrage 16).
  pendingMs: 0,
  pendingMinMs: 0,
  pendingComponent: PageSkeleton,
  component: PublicPage,
});
