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

async function firstRead(queryClient: QueryClient): Promise<void> {
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
  // Never waits for the script (PLAN § 3.3.1, step 4): with the local copy the page shows it at once and AutoRefresh
  // reads the script after the first render; without it this starts the first read (it takes the early fetch of the
  // <head>) and the page keeps its skeleton until the answer, or shows the load error box (G-01, G-03, 03 § 2.4).
  loader: ({ context: { queryClient } }) => {
    // Once only: a later navigation never reads again (AutoRefresh and « Réessayer » do).
    if (queryClient.getQueryState(publicStateOptions.queryKey) === undefined) {
      void firstRead(queryClient);
    }
  },
  // pendingMinMs: 0 is safe only because the page renders exactly PageSkeleton while hydrating (useHydrated in Page);
  // without that barrier, React error #418 (PLAN § 2.1, arbitrage 16).
  pendingMs: 0,
  pendingMinMs: 0,
  pendingComponent: PageSkeleton,
  component: PublicPage,
});
