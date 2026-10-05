import { DayDetail } from "@/features/calendar/DayCard";
import { RestaurantCalendar } from "@/features/calendar/RestaurantCalendar";
import { ModeSwitch } from "@/features/page/ModeSwitch";
import {
  Page,
  PageColumn,
  PageHeader,
  PageLoadError,
  PageMain,
  WhenLoaded,
} from "@/features/page/Page";
import { Columns } from "@/features/page/PageLayout";
import { PageSkeleton } from "@/features/page/PageSkeleton";
import { OpenDayFormR1 } from "@/features/staff/OpenDayFormR1";
import { OpenDayFormR2 } from "@/features/staff/OpenDayFormR2";
import { SettingsPanel } from "@/features/staff/SettingsPanel";
import { StaffDayCardR1 } from "@/features/staff/StaffDayCardR1";
import { StaffDayCardR2 } from "@/features/staff/StaffDayCardR2";
import { TomorrowPanel } from "@/features/staff/TomorrowPanel";
import { useSessionStore } from "@/session/session";

/**
 * Staff page (G-08, 06 § 2): the public page plus the staff panels, in the order of 06 § 2: « Demain ({date}) »
 * (C-01), « Paramètres » (C-02), then in each column « Ouvrir un jour » above the calendar (C-04 to C-06) and the staff
 * card of the selected day (C-10 to C-24).
 *
 * Once the session closes, the staff blocks render no more: the logout goes back to / (PLAN § 3.3.4).
 */
export function StaffPage() {
  const loggedIn = useSessionStore((session) => session.password !== null);
  if (!loggedIn) return <PageSkeleton />;
  return (
    <Page>
      <PageHeader>
        <ModeSwitch />
      </PageHeader>
      <PageMain>
        <WhenLoaded>
          <TomorrowPanel />
          <SettingsPanel />
        </WhenLoaded>
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
      </PageMain>
    </Page>
  );
}
