import { useId } from "react";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";

import { useIsR2OrderingClosed, useToday } from "@/background/clock";
import { dayStatusR1, dayStatusR2 } from "@/domain/capacity";
import type { CapacityState } from "@/domain/capacity";
import { isPast } from "@/domain/cutoff";
import { monthCells, weekCells } from "@/domain/dates";
import {
  calendarAnchor,
  calendarView,
  clickDay,
  goToToday,
  isSamePeriod,
  selectDay,
  selectedDay,
  shiftPeriod,
} from "@/domain/navigation";
import type { CalendarView, PageSearchParams } from "@/domain/navigation";
import type { IsoDate, Restaurant } from "@/domain/types";
import { usePageNavigate, usePageSearch } from "@/features/calendar/page-search";
import type { CalendarTransition } from "@/features/calendar/page-search";
import { useShownState } from "@/features/calendar/use-shown-state";
import { calendarDayLabel } from "@/intl/calendar";
import { formatPeriodLabel } from "@/intl/dates";
import { Button } from "@/ui/button/Button";
import { CalendarGrid } from "@/ui/calendar/CalendarGrid";
import type { CalendarDay } from "@/ui/calendar/CalendarGrid";
import { CalendarHeader } from "@/ui/calendar/CalendarHeader";
import { ViewToggle } from "@/ui/toggle/ViewToggle";

import styles from "@/features/calendar/RestaurantCalendar.module.css";
import "@/features/calendar/view-transitions.css";

const messages = defineMessages({
  views: {
    id: "common.calendar.view.label",
    defaultMessage: "Affichage du calendrier",
    description: "05 § 2.2, § 2.3, 08 § 6.3 — nom du groupe « Semaine | Mois »",
  },
  week: {
    id: "common.calendar.view.week",
    defaultMessage: "Semaine",
    description: "05 § 2.3 — segment de la vue semaine",
  },
  month: {
    id: "common.calendar.view.month",
    defaultMessage: "Mois",
    description: "05 § 2.3 — segment de la vue mois",
  },
});

interface CalendarDaysInput {
  restaurant: Restaurant;
  state: CapacityState;
  view: CalendarView;
  anchor: IsoDate;
  today: IsoDate;
  /** Today's R2 orders are closed (10:00, 01 § 3.7): its square says so (E-43). */
  todayClosed: boolean;
}

/** Squares of the week or month shown, with their gauge state and accessible name (05 § 2.1, § 2.4, § 2.5). */
function calendarDays(input: CalendarDaysInput): CalendarDay[] {
  const { restaurant, state, view, anchor, today } = input;
  const cells = view === "semaine" ? weekCells(anchor) : monthCells(anchor);
  return cells.map((cell) => {
    const status =
      restaurant === "r1" ? dayStatusR1(state, cell.iso) : dayStatusR2(state, cell.iso);
    const ordersClosed = restaurant === "r2" && cell.iso === today && input.todayClosed;
    return {
      iso: cell.iso,
      day: cell.day,
      outside: !cell.inMonth,
      dot: status,
      label: calendarDayLabel(cell.iso, { status, past: isPast(cell.iso, today), ordersClosed }),
    };
  });
}

/** « Aujourd'hui » slides the label only when the period shown changes (05 § 3.1). */
function todayTransition(
  anchor: IsoDate,
  today: IsoDate,
  view: CalendarView,
): CalendarTransition | null {
  if (isSamePeriod(anchor, today, view)) return null;
  return today > anchor ? "next" : "prev";
}

/** The card slides towards the day chosen with the mouse; the selected day again changes nothing (05 § 3.1). */
function dayTransition(iso: IsoDate, selected: IsoDate): CalendarTransition | null {
  if (iso === selected) return null;
  return iso > selected ? "day-next" : "day-prev";
}

/**
 * Calendar of a column (05 § 2-3), driven by the URL (PLAN § 3.2): a click selects a day (`push`; a day of a
 * neighbouring month keeps the month shown), the keys select and the view follows (`replace`), ‹ › change the period
 * without the selection, « Semaine / Mois » keep the anchor, « Aujourd'hui » selects today and closes what depended on
 * the day in this restaurant only (a-12). « Today » comes from the clock, never from `validateSearch`.
 */
export function RestaurantCalendar({ restaurant }: { restaurant: Restaurant }) {
  const intl = useIntl();
  const labelId = useId();
  const search = usePageSearch();
  const navigate = usePageNavigate();
  const today = useToday();
  const todayClosed = useIsR2OrderingClosed(today);
  const state = useShownState();
  const view = calendarView(search, restaurant);
  const anchor = calendarAnchor(search, restaurant, today);
  const selected = selectedDay(search, restaurant, today);
  const go = (next: PageSearchParams, replace: boolean, kind: CalendarTransition | null = null) => {
    navigate(next, { replace, transition: kind === null ? undefined : { restaurant, kind } });
  };
  return (
    <div className={styles["calendar"]}>
      <CalendarHeader
        view={view === "semaine" ? "week" : "month"}
        label={formatPeriodLabel(view, anchor)}
        labelId={labelId}
        transitionName={`${restaurant}-calendar-label`}
        onPrevious={() => {
          go(shiftPeriod(search, restaurant, -1, today), true, "prev");
        }}
        onNext={() => {
          go(shiftPeriod(search, restaurant, 1, today), true, "next");
        }}
      >
        <ViewToggle<CalendarView>
          aria-label={intl.formatMessage(messages.views)}
          size="small"
          items={[
            { value: "semaine", label: intl.formatMessage(messages.week) },
            { value: "mois", label: intl.formatMessage(messages.month) },
          ]}
          value={view}
          onValueChange={(next) => {
            const key = restaurant === "r1" ? "r1vue" : "r2vue";
            go({ ...search, [key]: next }, true, next === "semaine" ? "zoom-in" : "zoom-out");
          }}
        />
        <Button
          variant="ghost"
          size="small"
          onClick={() => {
            go(goToToday(search, restaurant), true, todayTransition(anchor, today, view));
          }}
        >
          <FormattedMessage
            id="common.calendar.today"
            defaultMessage="Aujourd'hui"
            description="05 § 2.3 — bouton qui sélectionne et affiche aujourd'hui"
          />
        </Button>
      </CalendarHeader>
      <CalendarGrid
        days={calendarDays({ restaurant, state, view, anchor, today, todayClosed })}
        selected={selected}
        today={today}
        labelledBy={labelId}
        transitionName={`${restaurant}-calendar-grid`}
        onSelect={(iso, { viaKeyboard }) => {
          if (viaKeyboard) {
            go(selectDay(search, restaurant, iso), true);
            return;
          }
          // A click on the selected day still closes its form (`selectDate`, 05 § 3.3).
          go(clickDay(search, restaurant, iso, today), false, dayTransition(iso, selected));
        }}
      />
    </div>
  );
}
