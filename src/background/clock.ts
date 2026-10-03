import { defineMessages } from "react-intl";
// Clock of the site (PLAN § 3.4, R-26): `now` changes on each minute, so at 10:00 and at midnight in Paris
// within a few milliseconds, and again when the tab comes back. Components read derived values only: they render
// again when the value changes, never on every tick, and never call Date.now() while rendering.
import { create } from "zustand";

import { currentSearch } from "@/background/deps";
import type { BackgroundDeps } from "@/background/deps";
import { isR2OrderingClosed } from "@/domain/cutoff";
import { parisDate } from "@/domain/paris";
import type { IsoDate, PublicState } from "@/domain/types";
import { intl } from "@/intl/intl";
import { stateKeys } from "@/queries/state";

const MINUTE_MS = 60_000;

// Value types of each message: react-intl types `formatMessage` from them (a descriptor without them takes no value).
const messages = defineMessages<{ r2Closed: { name2: string } }>({
  r2Closed: {
    id: "public.r2.cutoff",
    defaultMessage:
      "Commandes en ligne clôturées à 10h. Venez au restaurant {name2} à partir de 12h pour commander sur place.",
    description:
      "04 § 5.3, § 9, 01 § 3.7 — clôture des commandes R2 à 10 h (toast neutre, note de la fiche)",
  },
});

export const useClock = create<{ now: number }>()(() => ({ now: Date.now() }));

/** Today in Paris (D-12): calendars without `r1` / `r2` in the URL follow it at midnight. */
export function useToday(): IsoDate {
  return useClock((s) => parisDate(s.now));
}

/** R2 online orders closed for `iso` (01 § 3.7): true from 10:00 in Paris that day, and for past days. */
export function useIsR2OrderingClosed(iso: IsoDate): boolean {
  return useClock((s) => isR2OrderingClosed(iso, s.now));
}

/** Ticks on each minute and when the tab is shown again (`visibilitychange`, `pageshow`). Returns the stop. */
export function startClock(): () => void {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const tick = (): void => {
    clearTimeout(timer);
    const now = Date.now();
    useClock.setState({ now });
    timer = setTimeout(tick, MINUTE_MS - (now % MINUTE_MS));
  };
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.visibilityState === "visible") tick();
    },
    { signal: controller.signal },
  );
  window.addEventListener("pageshow", tick, { signal: controller.signal });
  tick();
  return () => {
    controller.abort();
    clearTimeout(timer);
  };
}

/**
 * At 10:00 (or when the tab comes back after it), an open public R2 form whose day is now closed is closed with
 * the neutral cutoff toast (03 § 5.3, a-7, E-09). Only the change from open to closed acts: a URL written by hand
 * on a day already closed shows no toast.
 */
export function watchR2Cutoff({ router, queryClient, showToast }: BackgroundDeps): () => void {
  return useClock.subscribe((clock, previous) => {
    const search = currentSearch(router);
    if (router.state.location.pathname !== "/" || search["reserver"] !== "r2") return;
    const r2 = search["r2"];
    const day = typeof r2 === "string" ? r2 : parisDate(clock.now);
    if (isR2OrderingClosed(day, previous.now) || !isR2OrderingClosed(day, clock.now)) return;
    void router.navigate({ to: "/", search: { ...search, reserver: undefined }, replace: true });
    const name2 = queryClient.getQueryData<PublicState>(stateKeys.public())?.settings.name2 ?? "";
    showToast(intl.formatMessage(messages.r2Closed, { name2 }), "neutral");
  });
}
