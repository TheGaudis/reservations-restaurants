import { useNavigate, useSearch } from "@tanstack/react-router";

import { useToday } from "@/background/clock";
import { selectedDay } from "@/domain/navigation";
import type { PageSearchParams } from "@/domain/navigation";
import type { IsoDate, Restaurant } from "@/domain/types";

// URL state of the calendars and day cards, read and written the same way on `/` and `/collegue` (PLAN § 3.2).

/** View transition of a calendar change (05 § 3.4): ‹ ›, « Semaine / Mois », a day chosen with the mouse. */
export type CalendarTransition = "next" | "prev" | "zoom-in" | "zoom-out" | "day-next" | "day-prev";

interface PageNavigation {
  /** `replace` for ‹ ›, « Semaine / Mois », « Aujourd'hui » and the keys; `push` for a click on a day (PLAN § 3.2). */
  replace: boolean;
  /** Restaurant whose label, grid and card take part in the transition; none: the change is immediate. */
  transition?: { restaurant: Restaurant; kind: CalendarTransition } | undefined;
}

/** Search params of the current page, validated by its route; all of them optional. */
export function usePageSearch(): PageSearchParams {
  return useSearch({ strict: false });
}

/** Selected day of a restaurant: the URL's, else today in Paris, which follows the clock at midnight (05 § 1). */
export function useSelectedDay(restaurant: Restaurant): IsoDate {
  return selectedDay(usePageSearch(), restaurant, useToday());
}

/**
 * View transition types of the router (`:active-view-transition-type(r1-next)`), or none: the motion is an extra,
 * left out when the visitor asks for less motion or the browser lacks transition types (05 § 3.4). Called from an
 * event handler, never while rendering.
 */
function viewTransition(transition: PageNavigation["transition"]): { types: string[] } | false {
  if (transition === undefined) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (!CSS.supports("selector(:active-view-transition-type(a))")) return false;
  return { types: [`${transition.restaurant}-${transition.kind}`] };
}

/**
 * Writes new search params on the current page. The calendar cells and ‹ › are buttons, not links (PLAN § 3.5), so
 * the navigation happens in their event handlers.
 */
export function usePageNavigate(): (search: PageSearchParams, options: PageNavigation) => void {
  const navigate = useNavigate();
  return (search, { replace, transition }) => {
    void navigate({
      to: ".",
      search,
      replace,
      resetScroll: false,
      viewTransition: viewTransition(transition),
    });
  };
}

/**
 * Closes a form of the current page (`replace`, no scroll). `update` receives the search params of the moment: a form
 * opened meanwhile stays open.
 */
export function useCloseForm(): (update: (search: PageSearchParams) => PageSearchParams) => void {
  const navigate = useNavigate();
  return (update) => {
    void navigate({ to: ".", search: update, replace: true, resetScroll: false });
  };
}
