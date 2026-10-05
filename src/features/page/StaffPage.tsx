import { DayDetail } from "@/features/calendar/DayCard";
import { RestaurantCalendar } from "@/features/calendar/RestaurantCalendar";
import { PageColumn, PageLoadError } from "@/features/page/Page";
import { Columns, Main } from "@/features/page/PageLayout";
import { PageSkeleton } from "@/features/page/PageSkeleton";
import { OpenDayFormR1 } from "@/features/staff/OpenDayFormR1";
import { OpenDayFormR2 } from "@/features/staff/OpenDayFormR2";
import { SettingsPanel } from "@/features/staff/SettingsPanel";
import { StaffDayCardR1 } from "@/features/staff/StaffDayCardR1";
import { StaffDayCardR2 } from "@/features/staff/StaffDayCardR2";
import { TomorrowPanel } from "@/features/staff/TomorrowPanel";
import { useSessionStore } from "@/session/session";

/**
 * Staff page (G-08, 06 § 2), under the header of the root: the public page plus the staff panels, in the order of
 * 06 § 2: « Demain ({date}) » (C-01), « Paramètres » (C-02), then in each column « Ouvrir un jour » above the calendar
 * (C-04 to C-06) and the staff card of the selected day (C-10 to C-24). The panels suspend until the full state is in
 * the cache, put there by the login.
 *
 * Once the session closes, the staff blocks render no more: the logout goes back to / (PLAN § 3.3.4).
 */
export function StaffPage() {
  const loggedIn = useSessionStore((session) => session.password !== null);
  if (!loggedIn) return <PageSkeleton />;
  return (
    <Main busy={false}>
      <TomorrowPanel />
      <SettingsPanel />
      <PageLoadError />
      <Columns>
        <PageColumn restaurant="r1">
          <OpenDayFormR1 />
          <RestaurantCalendar restaurant="r1" />
          <DayDetail restaurant="r1">
            <StaffDayCardR1 />
          </DayDetail>
        </PageColumn>
        <PageColumn restaurant="r2">
          <OpenDayFormR2 />
          <RestaurantCalendar restaurant="r2" />
          <DayDetail restaurant="r2">
            <StaffDayCardR2 />
          </DayDetail>
        </PageColumn>
      </Columns>
    </Main>
  );
}
