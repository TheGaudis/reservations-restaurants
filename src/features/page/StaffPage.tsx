import { DayDetail } from "@/features/calendar/DayCard";
import { RestaurantCalendar } from "@/features/calendar/RestaurantCalendar";
import { ModeSwitch } from "@/features/page/ModeSwitch";
import { Page } from "@/features/page/Page";
import { PageSkeleton } from "@/features/page/PageSkeleton";
import { OpenDayFormR1 } from "@/features/staff/OpenDayFormR1";
import { OpenDayFormR2 } from "@/features/staff/OpenDayFormR2";
import { SettingsPanel } from "@/features/staff/SettingsPanel";
import { StaffDayCardR1 } from "@/features/staff/StaffDayCardR1";
import { StaffDayCardR2 } from "@/features/staff/StaffDayCardR2";
import { TomorrowPanel } from "@/features/staff/TomorrowPanel";
import { useSessionStore } from "@/session/session";

/**
 * Staff page (G-08, 06 § 2): the public page plus the staff panels, in the order of 06 § 2. One slot per panel, each
 * a component of its own file (journal p5a, « Interfaces du socle »):
 * - `tomorrow`: `TomorrowPanel`, « Demain ({date}) » (C-01);
 * - `settings`: `SettingsPanel`, « Paramètres » (C-02);
 * - `openDayR1`, `openDayR2`: `OpenDayFormR1`, `OpenDayFormR2`, « Ouvrir un jour » above each calendar (C-04 to C-06);
 * - `dayCardR1`, `dayCardR2`: `StaffDayCardR1`, `StaffDayCardR2`, the staff cards and their own slots (C-10 to C-24).
 *
 * Once the session closes, the staff blocks render no more: the logout goes back to / (PLAN § 3.3.4).
 */
export function StaffPage() {
  const loggedIn = useSessionStore((session) => session.password !== null);
  if (!loggedIn) return <PageSkeleton />;
  return (
    <Page
      modeSwitch={<ModeSwitch />}
      panels={
        <>
          <TomorrowPanel />
          <SettingsPanel />
        </>
      }
      r1={{
        admin: <OpenDayFormR1 />,
        calendar: <RestaurantCalendar restaurant="r1" />,
        card: (
          <DayDetail restaurant="r1">
            <StaffDayCardR1 />
          </DayDetail>
        ),
      }}
      r2={{
        admin: <OpenDayFormR2 />,
        calendar: <RestaurantCalendar restaurant="r2" />,
        card: (
          <DayDetail restaurant="r2">
            <StaffDayCardR2 />
          </DayDetail>
        ),
      }}
    />
  );
}
