import type { IdentityValues } from "@/domain/bookings";
import type { BookingR1, BookingR2 } from "@/domain/types";
import { required } from "@/domain/validation";
import { useCloseForm } from "@/features/calendar/page-search";
import { intl } from "@/intl/intl";
import { staffCommonMessages } from "@/intl/staff-messages";
import { focusById } from "@/ui/pending-focus";

// Rules and closing shared by the two edit forms of a booking (06 § 7.2-7.4, E-48).

type IdentityKey = "name" | "className" | "contact";

/** Values of the identity fields as the booking holds them (06 § 7.2). */
export function identityOf(booking: BookingR1 | BookingR2): IdentityValues {
  return {
    name: booking.name,
    className: booking.className,
    contact: booking.contact,
    observation: booking.observation,
  };
}

/**
 * Rules of 06 § 7.2: name, class and contact required, the contact without any format check (D-04 not retained).
 * Messages keyed by field name, for the form's `onDynamic` validator.
 */
export function editIdentityErrors(
  values: Pick<IdentityValues, IdentityKey>,
): Partial<Record<IdentityKey, string>> {
  const results = {
    name: required(intl.formatMessage(staffCommonMessages.nameRequired))({ value: values.name }),
    className: required(intl.formatMessage(staffCommonMessages.classRequired))({
      value: values.className,
    }),
    contact: required(intl.formatMessage(staffCommonMessages.contactRequired))({
      value: values.contact,
    }),
  };
  const errors: Partial<Record<IdentityKey, string>> = {};
  for (const key of ["name", "className", "contact"] as const) {
    const message = results[key];
    if (message !== undefined) errors[key] = message;
  }
  return errors;
}

/** Id of « Modifier » of a booking (`editResa` value): the edit form gives it the focus back when it closes (E-48). */
export function editBookingButtonId(editResa: string): string {
  return `edit-booking-${editResa}`;
}

/**
 * Closes the edit form of `editResa` (`replace`) and gives the focus back to its « Modifier » (E-48). The focus moves
 * first: the button stays in the page while the form leaves it. Another form opened meanwhile stays open.
 */
export function useCloseEditBooking(editResa: string) {
  const closeForm = useCloseForm();
  return () => {
    focusById(editBookingButtonId(editResa));
    closeForm((previous) =>
      previous.editResa === editResa ? { ...previous, editResa: undefined } : previous,
    );
  };
}
