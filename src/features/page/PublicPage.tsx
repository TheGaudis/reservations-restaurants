import { BookingColumnsProvider } from "@/features/booking/BookingColumnsProvider";
import { ColumnSummary } from "@/features/booking/BookingSummary";
import { DayDetail } from "@/features/calendar/DayCard";
import { RestaurantCalendar } from "@/features/calendar/RestaurantCalendar";
import { PageColumn, PageLoadError } from "@/features/page/Page";
import { Columns, Main } from "@/features/page/PageLayout";
import { DayCardR1 } from "@/features/r1/DayCardR1";
import { DayCardR2 } from "@/features/r2/DayCardR2";

/**
 * Public page (G-02 to G-04, P-*, L-01), under the header of the root: in each column the calendar, then the summary of
 * the column's last booking and the card of the selected day with its form (05 § 1, 04 § 7). Rendered once the first
 * read has answered or failed (loader of /).
 */
export function PublicPage() {
  return (
    <BookingColumnsProvider>
      <Main busy={false}>
        <PageLoadError />
        <Columns>
          <PageColumn restaurant="r1">
            <RestaurantCalendar restaurant="r1" />
            <DayDetail restaurant="r1">
              <ColumnSummary restaurant="r1" />
              <DayCardR1 />
            </DayDetail>
          </PageColumn>
          <PageColumn restaurant="r2">
            <RestaurantCalendar restaurant="r2" />
            <DayDetail restaurant="r2">
              <ColumnSummary restaurant="r2" />
              <DayCardR2 />
            </DayDetail>
          </PageColumn>
        </Columns>
      </Main>
    </BookingColumnsProvider>
  );
}
