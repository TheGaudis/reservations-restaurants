import type { QueryClient } from "@tanstack/react-query";
import * as v from "valibot";

import { stateKeys } from "@/queries/state";

const CACHE_KEY = "reservations-cache-v1";
const MAX_AGE = 14 * 24 * 3600 * 1000;

const LocalCacheV1 = v.object({
  savedAt: v.number(),
  etag: v.optional(v.string()),
  config: v.object({ name1: v.string(), priceEleve: v.union([v.string(), v.number()]) }),
  r1Used: v.record(v.string(), v.number()),
  r1Days: v.array(
    v.object({ Date: v.string(), Capacite: v.union([v.string(), v.number()]), Menu: v.string() }),
  ),
});

/** Synchronous: the first render must come from the local copy. */
export function restoreLocalCache(queryClient: QueryClient): boolean {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(CACHE_KEY);
  } catch {
    return false;
  }
  if (raw === null) return false;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return false;
  }
  const parsed = v.safeParse(LocalCacheV1, json);
  if (!parsed.success || Date.now() - parsed.output.savedAt > MAX_AGE) return false;
  const c = parsed.output;
  queryClient.setQueryData(
    stateKeys.public(),
    {
      etag: c.etag ?? "",
      name1: c.config.name1,
      priceStudent: Number(c.config.priceEleve),
      daysR1: c.r1Days.map((d) => ({
        date: d.Date,
        capacity: Number(d.Capacite),
        menu: d.Menu,
        booked: c.r1Used[d.Date] ?? 0,
      })),
    },
    { updatedAt: c.savedAt },
  );
  return true;
}
