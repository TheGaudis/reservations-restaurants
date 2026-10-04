import type { QueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  redirect,
  retainSearchParams,
  stripSearchParams,
} from "@tanstack/react-router";
import * as v from "valibot";

import { CALENDAR_KEYS, publicSearch } from "@/domain/navigation";
import { CALENDAR_DEFAULTS, CalendarSearch } from "@/features/calendar/search";
import { StaffPage } from "@/features/page/StaffPage";
import { staffStateOptions } from "@/queries/state";

// Staff page (PLAN § 3.2, 09 § 1, § 4): every open panel and form is a search param, so a reload or a bookmark
// reopens it after the login (E-23). Ids of the fake script carry « + » (`r1b-d+1-ungerer`), real ones are UUIDs.

const RestaurantSchema = v.fallback(v.optional(v.picklist(["r1", "r2"])), undefined);
const DaySchema = v.fallback(v.optional(v.pipe(v.string(), v.isoDate())), undefined);
const FlagSchema = v.fallback(v.optional(v.boolean(), false), false);

function idParam(pattern: RegExp) {
  return v.fallback(v.optional(v.pipe(v.string(), v.regex(pattern))), undefined);
}

const StaffSearch = v.object({
  ...CalendarSearch.entries,
  /** « + Ouvrir un jour » of a column (C-04, C-06). */
  ouvrir: RestaurantSchema,
  /** Date picked in « Ouvrir un jour » (C-05); absent: the selected day of that restaurant. */
  ouvrirDate: DaySchema,
  /** « Paramètres » unfolded (C-02). */
  parametres: FlagSchema,
  /** « Modifier ce jour » of the R1 day `r1` (C-13); R1 only, D-09 not retained. */
  editJour: v.fallback(v.optional(v.picklist(["r1"])), undefined),
  /** Booking being edited, `{restaurant}:{id}` (C-11, C-24). */
  editResa: idParam(/^r[12]:[\w+-]{1,64}$/u),
  /** « + Ajouter une personne »: `r1` (day `r1`) or `r2:{dish id}` (C-12, C-23). */
  ajout: idParam(/^(?:r1|r2:[\w+-]{1,64})$/u),
  /** « + Ajouter un plat à ce jour » of the R2 day `r2` (C-21). */
  ajoutPlat: FlagSchema,
  /** Dish being edited (C-22). */
  editPlat: idParam(/^[\w+-]{1,64}$/u),
});

async function readFullState(queryClient: QueryClient, id: number, password: string) {
  try {
    await queryClient.query(staffStateOptions(id, password));
  } catch {
    // The page reads the failure from the query: `LoadErrorPage`, or the logout of a changed password (06 § 1.7).
  }
}

export const Route = createFileRoute("/collegue")({
  validateSearch: StaffSearch,
  search: {
    // Strip runs last (outer middleware): a retained default leaves the URL too (routes/index.tsx).
    middlewares: [
      stripSearchParams({ ...CALENDAR_DEFAULTS, parametres: false, ajoutPlat: false }),
      retainSearchParams(CALENDAR_KEYS),
    ],
  },
  // No password in memory (reload, bookmark, back button after a logout): the login panel opens on the public page,
  // which comes back to this exact URL after the login (06 § 1.4, D-11, REG-28). `retour` stays under /collegue.
  beforeLoad: ({ context: { session }, search, location }) => {
    if (session.getState().password === null) {
      throw redirect({
        to: "/",
        search: { ...publicSearch(search), connexion: true, retour: location.href },
        replace: true,
      });
    }
  },
  // The login put the full state in the cache before opening the session: nothing to read then. Otherwise this starts
  // the read without waiting; the page suspends on it (the full state leaves the cache when nobody observes it).
  loader: ({ context: { queryClient, session } }) => {
    const { id, password } = session.getState();
    if (
      password !== null &&
      queryClient.getQueryState(staffStateOptions(id, password).queryKey) === undefined
    ) {
      void readFullState(queryClient, id, password);
    }
  },
  component: StaffPage,
});
