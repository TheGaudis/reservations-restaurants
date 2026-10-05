import { FormattedMessage } from "react-intl";

import type { IsoDate, Restaurant } from "@/domain/types";
import { columnFocus, useBookingColumns } from "@/features/booking/booking-columns";
import { DayActions } from "@/features/calendar/DayCard";
import { usePageNavigate, usePageSearch } from "@/features/calendar/page-search";
import { commonMessages } from "@/intl/common-messages";
import { Button } from "@/ui/button/Button";
import { focusOnMount, requestFocus } from "@/ui/pending-focus";

interface ReserveButtonProps {
  restaurant: Restaurant;
  /** Day of the card. */
  iso: IsoDate;
}

/**
 * « Réserver » (05 § 5.1, § 6.2): opens the booking form of this restaurant (`reserver`, `push`), the only public
 * form of the page (D-11). The day is written in the URL even when it is today: the form keeps its date past midnight
 * (PLAN § 3.2, § 3.4). Opening a form removes the summary of its column (04 § 5.1, § 7) and gives the focus to
 * its first field; after « Annuler », the button that comes back takes the focus (04 § 5.1).
 */
export function ReserveButton({ restaurant, iso }: ReserveButtonProps) {
  const search = usePageSearch();
  const navigate = usePageNavigate();
  const columns = useBookingColumns();
  return (
    <DayActions>
      <Button
        ref={focusOnMount(columnFocus.reserve(restaurant))}
        variant="primary"
        onClick={() => {
          const day = restaurant === "r1" ? { r1: iso } : { r2: iso };
          columns.clear(restaurant);
          requestFocus(columnFocus.form(restaurant));
          navigate({ ...search, ...day, reserver: restaurant }, { replace: false });
        }}
      >
        <FormattedMessage {...commonMessages.book} />
      </Button>
    </DayActions>
  );
}
