import { useId, useState } from "react";

import type { CapacityClass } from "@/domain/capacity";
import { monthCells, weekCells } from "@/domain/dates";
import {
  calendarAnchor,
  calendarView,
  clickDay,
  goToToday,
  selectDay,
  selectedDay,
  shiftPeriod,
} from "@/domain/navigation";
import type { CalendarSearchParams, CalendarView } from "@/domain/navigation";
import type { IsoDate, Restaurant } from "@/domain/types";
import { calendarDayLabel } from "@/intl/calendar";
import { formatPeriodLabel } from "@/intl/dates";
import { Button } from "@/ui/button/Button";
import { CalendarGrid } from "@/ui/calendar/CalendarGrid";
import { CalendarHeader } from "@/ui/calendar/CalendarHeader";
import { ViewToggle } from "@/ui/toggle/ViewToggle";

export interface CalendarDemoProps {
  restaurant?: Restaurant | undefined;
  /** Search params at the start: `r1`, `r1vue`, `r1periode`… */
  search?: CalendarSearchParams | undefined;
  today: IsoDate;
  /** Gauge state of the service days; any other day has no service. */
  statuses?: Readonly<Record<IsoDate, CapacityClass>> | undefined;
  /** R2 days whose orders are closed (today after 10:00). */
  closedDays?: readonly IsoDate[] | undefined;
  onSelect?: ((iso: IsoDate, details: { viaKeyboard: boolean }) => void) | undefined;
}

const NO_SEARCH: CalendarSearchParams = {};
const NO_STATUSES: Readonly<Record<IsoDate, CapacityClass>> = {};
const NO_DAYS: readonly IsoDate[] = [];

/**
 * A column calendar wired the way P4 (b) wires it, with the URL replaced by a local state: click = `clickDay`, keys =
 * `selectDay` (the view follows), ‹ › = `shiftPeriod`, « Aujourd'hui » = `goToToday`. Tests and stories only.
 */
export function CalendarDemo({
  restaurant = "r1",
  search: initialSearch = NO_SEARCH,
  today,
  statuses = NO_STATUSES,
  closedDays = NO_DAYS,
  onSelect,
}: CalendarDemoProps) {
  const labelId = useId();
  const [search, setSearch] = useState<CalendarSearchParams>(initialSearch);
  const view = calendarView(search, restaurant);
  const anchor = calendarAnchor(search, restaurant, today);
  const selected = selectedDay(search, restaurant, today);
  const cells = view === "semaine" ? weekCells(anchor) : monthCells(anchor);
  const days = cells.map((cell) => ({
    iso: cell.iso,
    day: cell.day,
    outside: !cell.inMonth,
    dot: statuses[cell.iso] ?? null,
    label: calendarDayLabel(cell.iso, {
      status: statuses[cell.iso] ?? null,
      past: cell.iso < today,
      ordersClosed: closedDays.includes(cell.iso),
    }),
  }));
  const viewKey = restaurant === "r1" ? "r1vue" : "r2vue";
  return (
    <div data-accent={restaurant}>
      <CalendarHeader
        view={view === "semaine" ? "week" : "month"}
        label={formatPeriodLabel(view, anchor)}
        labelId={labelId}
        onPrevious={() => {
          setSearch(shiftPeriod(search, restaurant, -1, today));
        }}
        onNext={() => {
          setSearch(shiftPeriod(search, restaurant, 1, today));
        }}
      >
        <ViewToggle<CalendarView>
          aria-label="Affichage du calendrier"
          size="small"
          items={[
            { value: "semaine", label: "Semaine" },
            { value: "mois", label: "Mois" },
          ]}
          value={view}
          onValueChange={(next) => {
            setSearch({ ...search, [viewKey]: next });
          }}
        />
        <Button
          variant="ghost"
          size="small"
          onClick={() => {
            setSearch(goToToday(search, restaurant));
          }}
        >
          Aujourd&apos;hui
        </Button>
      </CalendarHeader>
      <CalendarGrid
        days={days}
        selected={selected}
        today={today}
        labelledBy={labelId}
        onSelect={(iso, details) => {
          onSelect?.(iso, details);
          setSearch(
            details.viaKeyboard
              ? selectDay(search, restaurant, iso)
              : clickDay(search, restaurant, iso, today),
          );
        }}
      />
    </div>
  );
}
