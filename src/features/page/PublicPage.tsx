import { DayDetail } from "@/features/calendar/DayCard";
import { RestaurantCalendar } from "@/features/calendar/RestaurantCalendar";
import { Page } from "@/features/page/Page";
import { DayCardR1 } from "@/features/r1/DayCardR1";
import { DayCardR2 } from "@/features/r2/DayCardR2";

/**
 * Public page (G-01 to G-05, P-*): in each column the calendar, then the card of the selected day (05 § 1). `Page`
 * renders exactly `PageSkeleton` while React hydrates (arbitrage 16).
 */
export function PublicPage() {
  return (
    <Page
      r1={{
        calendar: <RestaurantCalendar restaurant="r1" />,
        card: (
          <DayDetail restaurant="r1">
            <DayCardR1 />
          </DayDetail>
        ),
      }}
      r2={{
        calendar: <RestaurantCalendar restaurant="r2" />,
        card: (
          <DayDetail restaurant="r2">
            <DayCardR2 />
          </DayDetail>
        ),
      }}
    />
  );
}
