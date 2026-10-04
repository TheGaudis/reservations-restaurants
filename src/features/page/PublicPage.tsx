import { BookingColumnsProvider } from "@/features/booking/BookingColumnsProvider";
import { ColumnSummary } from "@/features/booking/BookingSummary";
import { DayDetail } from "@/features/calendar/DayCard";
import { RestaurantCalendar } from "@/features/calendar/RestaurantCalendar";
import { Page } from "@/features/page/Page";
import { BookingFormR1Slot } from "@/features/r1/BookingFormR1Slot";
import { DayCardR1 } from "@/features/r1/DayCardR1";
import { DayCardR2 } from "@/features/r2/DayCardR2";

/**
 * Public page (G-01 to G-05, P-*): in each column the calendar, then the summary of the column's last booking and
 * the card of the selected day with its form (05 § 1, 04 § 7). `Page` renders exactly `PageSkeleton` while React
 * hydrates (arbitrage 16).
 */
export function PublicPage() {
  return (
    <BookingColumnsProvider>
      <Page
        r1={{
          calendar: <RestaurantCalendar restaurant="r1" />,
          card: (
            <DayDetail restaurant="r1">
              <ColumnSummary restaurant="r1" />
              <DayCardR1 form={<BookingFormR1Slot />} />
            </DayDetail>
          ),
        }}
        r2={{
          calendar: <RestaurantCalendar restaurant="r2" />,
          card: (
            <DayDetail restaurant="r2">
              <ColumnSummary restaurant="r2" />
              <DayCardR2 />
            </DayDetail>
          ),
        }}
      />
    </BookingColumnsProvider>
  );
}
