import type { SeatCountValues } from "@/domain/bookings";
import { seatTotal } from "@/domain/pricing";
import { countValue } from "@/domain/validation";
import { commonMessages } from "@/intl/common-messages";
import { intl } from "@/intl/intl";

/**
 * Message of the row of R1 counters (04 § 5.2, D-18): no seat at all, or more seats than `max` (seats left that
 * day). Null when the counters are valid. The script checks the seats again (02 § 4.4).
 */
function seatRowError(values: SeatCountValues, max: number): string | null {
  const seats = seatTotal({
    students: countValue(values.students),
    staffMembers: countValue(values.staffMembers),
    externals: countValue(values.externals),
  });
  if (seats <= 0) return intl.formatMessage(commonMessages.atLeastOnePerson);
  if (seats > max) return intl.formatMessage(commonMessages.maxSeats, { count: max });
  return null;
}

/**
 * The row message on each counter, for a form's `onDynamic` validator: the three fields turn red and point to the
 * single message under the row (`SeatCountersR1`).
 */
export function seatErrors(
  values: SeatCountValues,
  max: number,
): Partial<Record<keyof SeatCountValues, string>> {
  const message = seatRowError(values, max);
  if (message === null) return {};
  return { students: message, staffMembers: message, externals: message };
}
