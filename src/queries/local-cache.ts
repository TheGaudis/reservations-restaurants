import type { QueryClient } from "@tanstack/react-query";
import * as v from "valibot";

import { stateKeys } from "@/queries/state";

const LOCAL_CACHE_KEY = "reservations-cache-v1";
const LOCAL_CACHE_MAX_AGE_MS = 14 * 24 * 3600 * 1000; // CACHE_MAX_AGE, 00 § 2.1

/** Restaurant names of the local copy, the only part of the public state the shell displays. */
export interface ShellState {
  etag: string | null;
  settings: { name1: string; name2: string };
}

// Subset of the v1 format (03 § 1.1); the other fields are ignored here.
const LocalCacheV1Schema = v.object({
  savedAt: v.number(),
  etag: v.optional(v.string()),
  config: v.object({ name1: v.string(), name2: v.string() }),
});

function readLocalCache(): unknown {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) ?? "null");
  } catch {
    return null; // private browsing, blocked storage or invalid JSON (03 § 1)
  }
}

/** Synchronous, before the router: the first render after the skeleton comes from the local copy (PLAN § 3.3.1). */
export function restoreLocalCache(queryClient: QueryClient, now: number): boolean {
  const parsed = v.safeParse(LocalCacheV1Schema, readLocalCache());
  if (!parsed.success || now - parsed.output.savedAt >= LOCAL_CACHE_MAX_AGE_MS) return false;
  const { savedAt, etag, config } = parsed.output;
  const state: ShellState = {
    etag: etag ?? null,
    settings: { name1: config.name1, name2: config.name2 },
  };
  queryClient.setQueryData(stateKeys.public(), state, { updatedAt: savedAt });
  return true;
}
