import { createFileRoute, retainSearchParams, stripSearchParams } from "@tanstack/react-router";
import * as v from "valibot";

import { PublicPage } from "@/features/page/PublicPage";
import { publicStateOptions } from "@/queries/state";

const IsoDate = v.pipe(v.string(), v.isoDate());

const HomeSearch = v.object({
  r1: v.fallback(v.optional(IsoDate), undefined),
  r1vue: v.fallback(v.optional(v.picklist(["semaine", "mois"]), "semaine"), "semaine"),
  reserver: v.fallback(v.optional(v.picklist(["r1", "r2"])), undefined),
  connexion: v.fallback(v.optional(v.boolean(), false), false),
});

export const Route = createFileRoute("/")({
  validateSearch: HomeSearch,
  search: {
    middlewares: [
      retainSearchParams(["r1", "r1vue"]),
      stripSearchParams({ r1vue: "semaine", connexion: false }),
    ],
  },
  loader: async ({ context: { queryClient } }) =>
    queryClient.query({ ...publicStateOptions, staleTime: "static" }),
  pendingMs: 0,
  component: PublicPage,
});
