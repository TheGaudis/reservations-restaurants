import { useIntl } from "react-intl";

import type { IsoDate, Restaurant } from "@/domain/types";
import { DayActions } from "@/features/calendar/DayCard";
import { usePageNavigate, usePageSearch } from "@/features/calendar/page-search";
import { commonMessages } from "@/intl/common-messages";
import { Button } from "@/ui/button/Button";

interface ReserveButtonProps {
  restaurant: Restaurant;
  /** Day of the card. */
  iso: IsoDate;
}

/**
 * « Réserver » (05 § 5.1, § 6.2): opens the booking form of this restaurant (`reserver`, `push`), the only public
 * form of the page (D-11). The day is written in the URL even when it is today: the form keeps its date past midnight
 * (PLAN § 3.2, § 3.4).
 */
export function ReserveButton({ restaurant, iso }: ReserveButtonProps) {
  const intl = useIntl();
  const search = usePageSearch();
  const navigate = usePageNavigate();
  return (
    <DayActions>
      <Button
        variant="primary"
        onClick={() => {
          const day = restaurant === "r1" ? { r1: iso } : { r2: iso };
          navigate({ ...search, ...day, reserver: restaurant }, { replace: false });
        }}
      >
        {intl.formatMessage(commonMessages.book)}
      </Button>
    </DayActions>
  );
}
