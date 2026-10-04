import { hashKey } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import * as v from "valibot";

import {
  DishSchema,
  IsoDateCell,
  NumberCell,
  ServiceDayR1Schema,
  ServiceDayR2Schema,
  SettingsSchema,
} from "@/api/schemas";
import { LOCAL_CACHE_MAX_AGE_MS } from "@/domain/constants";
import type { IsoDate, PublicState, Settings } from "@/domain/types";
import { publicStateOptions } from "@/queries/state";

// Local copy of the public state (03 § 1, PLAN § 3.3.5). Its format is a contract with the old site, read and
// written by both until the switch and after a rollback (R-21): the key and the field names never change. Every
// storage access sits in a try/catch: private browsing, a full quota or a blocked storage leave the page working
// without copy (03 § 1).

const LOCAL_CACHE_KEY = "reservations-cache-v1";
const FALLBACK_TEXTS_KEY = "reservations-textes";

/** Exact v1 format, as `saveCache` writes it (03 § 1.1): no personal data, bookings summed per day and per dish. */
export interface LocalCacheV1 {
  savedAt: number;
  /** Absent from a copy the old site wrote from the full state of a staff session. */
  etag?: string;
  config: {
    name1: string;
    name2: string;
    desc1: string;
    desc2: string;
    contactAnnulation: string;
    priceEleve: string;
    priceProf: string;
    priceExterieur: string;
  };
  r1Used: Record<IsoDate, number>;
  r2Used: Record<string, number>;
  r1Days: Array<{ Date: IsoDate; Capacite: number; Theme: string; Menu: string }>;
  r2Days: Array<{ Date: IsoDate; Theme: string; Note: string }>;
  /** `Nom` without the voucher mark, `Ticket` set instead (01 § 3.5). */
  r2Items: Array<{
    ID: string;
    Date: IsoDate;
    Nom: string;
    Stock: number;
    Prix: number | "";
    Ticket: boolean;
  }>;
}

/**
 * Reads the v1 format with the schemas of the public state: the same checks and the same idempotent translation
 * (a plain name with `Ticket` stays as it is). Unknown keys are dropped, so nothing else from the storage enters
 * the app.
 * @internal exported for the tests
 */
export const LocalCacheV1Schema = v.object({
  savedAt: v.number(),
  etag: v.optional(v.string()),
  config: SettingsSchema,
  r1Used: v.record(IsoDateCell, NumberCell),
  r2Used: v.record(v.string(), NumberCell),
  r1Days: v.array(ServiceDayR1Schema),
  r2Days: v.array(ServiceDayR2Schema),
  r2Items: v.array(DishSchema),
});

/**
 * Public state of a valid copy (`loadCache`, 03 § 1.1): the sums become the public aggregates.
 * @internal exported for the tests
 */
export function fromLocalCacheV1(copy: v.InferOutput<typeof LocalCacheV1Schema>): PublicState {
  return {
    etag: copy.etag === undefined || copy.etag === "" ? null : copy.etag,
    settings: copy.config,
    r1Days: copy.r1Days,
    r1Booked: Object.entries(copy.r1Used).map(([date, seats]) => ({ date, seats })),
    r2Days: copy.r2Days,
    dishes: copy.r2Items,
    r2Booked: Object.entries(copy.r2Used).map(([dishId, portions]) => ({ dishId, portions })),
  };
}

/** Sums per key, in order of first appearance, like `saveCache`. */
function sums<T>(rows: readonly T[], key: (row: T) => string, count: (row: T) => number) {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(key(row), (totals.get(key(row)) ?? 0) + count(row));
  return Object.fromEntries(totals);
}

/** Settings as the script sends them: prices are strings in the sheet (`'4.95'`, 01 § 2.1). */
function apiConfig(settings: Settings): LocalCacheV1["config"] {
  return {
    name1: settings.name1,
    name2: settings.name2,
    desc1: settings.desc1,
    desc2: settings.desc2,
    contactAnnulation: settings.cancellationContact,
    priceEleve: String(settings.priceStudent),
    priceProf: String(settings.priceStaff),
    priceExterieur: String(settings.priceExternal),
  };
}

/**
 * The copy of `state`, field for field as `saveCache` writes it (03 § 1.1).
 * @internal exported for the tests
 */
export function toLocalCacheV1(state: PublicState, savedAt: number): LocalCacheV1 {
  return {
    savedAt,
    ...(state.etag === null ? {} : { etag: state.etag }),
    config: apiConfig(state.settings),
    r1Used: sums(
      state.r1Booked,
      (total) => total.date,
      (total) => total.seats,
    ),
    r2Used: sums(
      state.r2Booked,
      (total) => total.dishId,
      (total) => total.portions,
    ),
    r1Days: state.r1Days.map((day) => ({
      Date: day.date,
      Capacite: day.capacity,
      Theme: day.theme,
      Menu: day.menu,
    })),
    r2Days: state.r2Days.map((day) => ({ Date: day.date, Theme: day.theme, Note: day.note })),
    r2Items: state.dishes.map((dish) => ({
      ID: dish.id,
      Date: dish.date,
      Nom: dish.name,
      Stock: dish.stock,
      Prix: dish.price ?? "",
      Ticket: dish.voucher,
    })),
  };
}

function readStorage(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null; // private browsing, blocked storage or invalid JSON (03 § 1)
  }
}

/**
 * Synchronous, before the router (PLAN § 3.3.1, step 3): puts a copy younger than 14 days under the public key,
 * dated by its `savedAt`, so that the first render after the skeleton comes from it. The copy is marked stale: the
 * first observer reads the script at once, whatever its age (`loadAll` at startup, 03 § 2.4).
 */
export function restoreLocalCache(queryClient: QueryClient, now: number): boolean {
  const parsed = v.safeParse(LocalCacheV1Schema, readStorage(LOCAL_CACHE_KEY));
  if (!parsed.success || !(now - parsed.output.savedAt < LOCAL_CACHE_MAX_AGE_MS)) return false;
  const { queryKey } = publicStateOptions;
  // A copy dated in the future (clock changed since) counts as written now.
  const updatedAt = Math.min(parsed.output.savedAt, now);
  queryClient.setQueryData(queryKey, fromLocalCacheV1(parsed.output), { updatedAt });
  void queryClient.invalidateQueries({ queryKey, exact: true, refetchType: "none" });
  return true;
}

/**
 * Writes the copy after each successful update of the public state, from a read, an `unchanged` answer (new
 * `savedAt`) or a booking (03 § 1.1). Never from the full state, never without etag (PLAN § 3.3.5, a-22, E-17).
 * Subscribed after `restoreLocalCache`: restoring writes nothing. Returns the unsubscribe function.
 */
export function persistLocalCache(queryClient: QueryClient, now: () => number = Date.now) {
  const { queryKey } = publicStateOptions;
  const publicHash = hashKey(queryKey);
  return queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== "updated" || event.action.type !== "success") return;
    if (event.query.queryHash !== publicHash) return;
    const state = queryClient.getQueryData(queryKey);
    if (state === undefined || state.etag === null || state.etag === "") return;
    try {
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(toLocalCacheV1(state, now())));
    } catch {
      // full quota or blocked storage: the page works without copy (03 § 1)
    }
  });
}

/**
 * `reservations-textes` (03 § 1.2): titles of the last visit, read when there is no valid copy, never written.
 */
export type FallbackTexts = Partial<Pick<Settings, "name1" | "name2" | "desc1" | "desc2">>;

const FallbackTextsSchema = v.object({
  name1: v.exactOptional(v.string()),
  name2: v.exactOptional(v.string()),
  desc1: v.exactOptional(v.string()),
  desc2: v.exactOptional(v.string()),
});

/**
 * The stored titles, or null when there are none or they cannot be read (03 § 1.2, E-18).
 */
export function readFallbackTexts(): FallbackTexts | null {
  const parsed = v.safeParse(FallbackTextsSchema, readStorage(FALLBACK_TEXTS_KEY));
  return parsed.success ? parsed.output : null;
}
