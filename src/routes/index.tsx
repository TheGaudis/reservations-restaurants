import { createFileRoute, retainSearchParams, stripSearchParams } from "@tanstack/react-router";
import * as v from "valibot";

import { CALENDAR_KEYS } from "@/domain/navigation";
import { CALENDAR_DEFAULTS, CalendarSearch } from "@/features/calendar/search";
import { PageSkeleton } from "@/features/page/PageSkeleton";
import { PublicPage } from "@/features/page/PublicPage";
import { waitForFirstRead } from "@/queries/first-read";

// Public page (PLAN § 3.2, 09 § 1). `?connexion=1` is a number and falls back to false: links write `true`.
const HomeSearch = v.object({
  ...CalendarSearch.entries,
  reserver: v.fallback(v.optional(v.picklist(["r1", "r2"])), undefined),
  connexion: v.fallback(v.optional(v.boolean(), false), false),
  retour: v.fallback(v.optional(v.pipe(v.string(), v.startsWith("/collegue"))), undefined),
});

export const Route = createFileRoute("/")({
  validateSearch: HomeSearch,
  search: {
    // Strip runs last (outer middleware): a retained default (`r1vue=semaine`) leaves the URL too.
    middlewares: [
      stripSearchParams({ ...CALENDAR_DEFAULTS, connexion: false }),
      retainSearchParams(CALENDAR_KEYS),
    ],
  },
  // Waits for the first read without a local copy: the skeleton until it answers (G-01); with the copy, the page shows
  // it at once (G-02, PLAN § 3.3.1). After a failure, the page throws it to `LoadErrorPage` (G-03).
  loader: async ({ context: { queryClient } }) => {
    await waitForFirstRead(queryClient);
  },
  pendingMs: 0,
  pendingComponent: PageSkeleton,
  component: PublicPage,
});
