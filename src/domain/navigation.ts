// Pure transformations of the search params that drive the two calendars and the open forms (PLAN § 3.2).
// Param names and values stay in French: users see them in the URL (`r1vue=mois`, `reserver=r2`).
// A key set to `undefined` is left out of the URL by the router.

import { addDays, addMonthsClamped, firstOfMonth, isSameMonth, isSameWeek } from "@/domain/dates";
import type { IsoDate, Restaurant } from "@/domain/types";

/** Calendar view of a restaurant, as written in the URL (`r1vue`, `r2vue`). */
export type CalendarView = "semaine" | "mois";

/** Search params of the calendars, shared by `/` and `/collegue` (PLAN § 3.2). */
export interface CalendarSearchParams {
  /** Selected day; absent = today in Paris, resolved by the component. */
  r1?: IsoDate | undefined;
  r2?: IsoDate | undefined;
  /** Absent = `semaine`. */
  r1vue?: CalendarView | undefined;
  r2vue?: CalendarView | undefined;
  /** Anchor of the displayed week or month; absent = the period of the selected day. */
  r1periode?: IsoDate | undefined;
  r2periode?: IsoDate | undefined;
}

/** Every search param of both pages (PLAN § 3.2) that depends on a day or a restaurant. */
export interface PageSearchParams extends CalendarSearchParams {
  reserver?: Restaurant | undefined;
  ouvrir?: Restaurant | undefined;
  ouvrirDate?: IsoDate | undefined;
  editJour?: "r1" | undefined;
  /** `{restaurant}:{booking id}`. */
  editResa?: string | undefined;
  /** `r1`, or `r2:{dish id}`. */
  ajout?: string | undefined;
  ajoutPlat?: boolean | undefined;
  editPlat?: string | undefined;
}

/** Params kept from one page to the other (`retainSearchParams`) and by `publicSearch`. */
export const CALENDAR_KEYS: Array<keyof CalendarSearchParams> = [
  "r1",
  "r2",
  "r1vue",
  "r2vue",
  "r1periode",
  "r2periode",
];

export function calendarView(search: CalendarSearchParams, restaurant: Restaurant): CalendarView {
  return (restaurant === "r1" ? search.r1vue : search.r2vue) ?? "semaine";
}

/** Day whose card is shown: the URL's, else today (05 § 1). */
export function selectedDay(
  search: CalendarSearchParams,
  restaurant: Restaurant,
  today: IsoDate,
): IsoDate {
  return (restaurant === "r1" ? search.r1 : search.r2) ?? today;
}

/** Anchor of the displayed week or month: the URL's, else the selected day (05 § 1). */
export function calendarAnchor(
  search: CalendarSearchParams,
  restaurant: Restaurant,
  today: IsoDate,
): IsoDate {
  return (
    (restaurant === "r1" ? search.r1periode : search.r2periode) ??
    selectedDay(search, restaurant, today)
  );
}

/** Both days fall in the same displayed week or month. */
export function isSamePeriod(a: IsoDate, b: IsoDate, view: CalendarView): boolean {
  return view === "semaine" ? isSameWeek(a, b) : isSameMonth(a, b);
}

function dayParams(restaurant: Restaurant, day: IsoDate | undefined): CalendarSearchParams {
  return restaurant === "r1"
    ? { r1: day, r1periode: undefined }
    : { r2: day, r2periode: undefined };
}

function anchorParams(restaurant: Restaurant, anchor: IsoDate | undefined): CalendarSearchParams {
  return restaurant === "r1" ? { r1periode: anchor } : { r2periode: anchor };
}

function belongsTo(param: string | undefined, restaurant: Restaurant): boolean {
  return param === restaurant || param?.startsWith(`${restaurant}:`) === true;
}

/** Closes what depends on the selected day of this restaurant, and only of this one (a-12, D-11). */
function closedForms(search: PageSearchParams, restaurant: Restaurant): PageSearchParams {
  return {
    reserver: search.reserver === restaurant ? undefined : search.reserver,
    ouvrirDate: search.ouvrir === restaurant ? undefined : search.ouvrirDate,
    editResa: belongsTo(search.editResa, restaurant) ? undefined : search.editResa,
    ajout: belongsTo(search.ajout, restaurant) ? undefined : search.ajout,
    ...(restaurant === "r1"
      ? { editJour: undefined }
      : { ajoutPlat: undefined, editPlat: undefined }),
  };
}

/**
 * Selects a day (`selectDate`, 05 § 3.3): the view follows the selection, as with the keyboard (05 § 3.2), and the
 * forms tied to the day close in this restaurant only (a-12). The column clears its own booking summary.
 */
export function selectDay<S extends PageSearchParams>(
  search: S,
  restaurant: Restaurant,
  iso: IsoDate,
): S {
  return { ...search, ...closedForms(search, restaurant), ...dayParams(restaurant, iso) };
}

/**
 * Click on a calendar cell (`pickDate`, 05 § 3.1): as `selectDay`, but a day of a neighbouring month shown in the
 * month view is selected without changing the displayed month (a-23).
 */
export function clickDay<S extends PageSearchParams>(
  search: S,
  restaurant: Restaurant,
  iso: IsoDate,
  today: IsoDate,
): S {
  const anchor = calendarAnchor(search, restaurant, today);
  const selected = selectDay(search, restaurant, iso);
  if (isSamePeriod(anchor, iso, calendarView(search, restaurant))) return selected;
  return { ...selected, ...anchorParams(restaurant, anchor) };
}

/**
 * ‹ › (`navCal`, 05 § 3.1): previous or next week (anchor ± 7 days) or month (1st of the month ± 1); the selection
 * does not change. The anchor leaves the URL when it falls in the period of the selected day.
 */
export function shiftPeriod<S extends CalendarSearchParams>(
  search: S,
  restaurant: Restaurant,
  direction: 1 | -1,
  today: IsoDate,
): S {
  const view = calendarView(search, restaurant);
  const anchor = calendarAnchor(search, restaurant, today);
  const next =
    view === "semaine"
      ? addDays(anchor, 7 * direction)
      : addMonthsClamped(firstOfMonth(anchor), direction);
  const inSelectedPeriod = isSamePeriod(next, selectedDay(search, restaurant, today), view);
  return { ...search, ...anchorParams(restaurant, inSelectedPeriod ? undefined : next) };
}

/**
 * « Aujourd'hui » (`jumpToday`, 05 § 3.1): today selected and displayed, and, as for `selectDay`, the forms of this
 * restaurant closed, the open booking form included: it does not reopen on today.
 */
export function goToToday<S extends PageSearchParams>(search: S, restaurant: Restaurant): S {
  return { ...search, ...closedForms(search, restaurant), ...dayParams(restaurant, undefined) };
}

/** Only the calendar params: the public page after leaving the staff mode (PLAN § 3.3.4). */
export function publicSearch(search: CalendarSearchParams): CalendarSearchParams {
  const { r1, r2, r1vue, r2vue, r1periode, r2periode } = search;
  return { r1, r2, r1vue, r2vue, r1periode, r2periode };
}
