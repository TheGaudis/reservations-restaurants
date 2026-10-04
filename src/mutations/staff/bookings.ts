import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteBookingR1, deleteBookingR2, editBookingR1, editBookingR2 } from "@/api/actions";
import { BusinessError } from "@/api/errors";
import type { EditBookingR1Input, EditBookingR2Input, Restaurant } from "@/domain/types";
import { intl } from "@/intl/intl";
import { staffCommonMessages } from "@/intl/staff-messages";
import { staffWriteOptions } from "@/mutations/staff/write";
import { stateKeys } from "@/queries/state";

// Staff writes of the bookings (02 § 4.7, 06 § 7): `editBookingR1`, `editBookingR2`, `deleteBookingR1`,
// `deleteBookingR2`, built with `staffWriteOptions` (write.ts). The person added by a colleague goes through
// `useBookR1` / `useOrderR2` of mutations/bookings.ts, without password (06 § 8).

/** `editBookingR1` refused for lack of seats (02 § 4.7): « Il ne reste que 2 couvert(s) disponible(s) pour ce jour. » */
const SEATS_REFUSAL = /^Il ne reste que -?\d+ couvert\(s\) disponible\(s\) pour ce jour\.$/u;

/** `editBookingR2` refused for lack of stock (02 § 4.7): « Il ne reste que 3 portion(s) disponible(s) pour ce plat. » */
const STOCK_REFUSAL = /^Il ne reste que -?\d+ portion\(s\) disponible\(s\) pour ce plat\.$/u;

/**
 * The script refused an edited booking for lack of seats (R1) or portions (R2): its message goes under the counters or
 * the portions (a-5), and the full state is read again (a-4).
 */
export function isCapacityRefusal(error: unknown): error is BusinessError {
  return (
    error instanceof BusinessError &&
    (SEATS_REFUSAL.test(error.message) || STOCK_REFUSAL.test(error.message))
  );
}

/** Reads the full state again after a capacity refusal: the seats or portions left changed meanwhile (a-4). */
function useRefreshOnCapacityRefusal() {
  const queryClient = useQueryClient();
  return (error: Error) => {
    if (isCapacityRefusal(error)) {
      void queryClient.invalidateQueries({ queryKey: stateKeys.staffAll() });
    }
  };
}

/** « Modifier » of an R1 booking (06 § 7.3): `qte` and `prixTotal` sent, recomputed by the script. */
export function useEditBookingR1() {
  const onError = useRefreshOnCapacityRefusal();
  return useMutation({
    ...staffWriteOptions({
      domain: "bookings",
      action: "editBookingR1",
      write: async (password: string, input: EditBookingR1Input) => editBookingR1(password, input),
      successToast: () => intl.formatMessage(staffCommonMessages.bookingEdited),
    }),
    onError,
  });
}

/** « Modifier » of an R2 booking line (06 § 7.4). */
export function useEditBookingR2() {
  const onError = useRefreshOnCapacityRefusal();
  return useMutation({
    ...staffWriteOptions({
      domain: "bookings",
      action: "editBookingR2",
      write: async (password: string, input: EditBookingR2Input) => editBookingR2(password, input),
      successToast: () => intl.formatMessage(staffCommonMessages.bookingEdited),
    }),
    onError,
  });
}

/**
 * « Supprimer » of a booking, second click (06 § 5.2, § 7.1): the variable is the booking id. The script e-mails the
 * person when the contact is an address (02 § 6.2); the page does not say whether it left.
 */
export function useDeleteBooking(restaurant: Restaurant) {
  return useMutation(
    staffWriteOptions({
      domain: "bookings",
      action: restaurant === "r1" ? "deleteBookingR1" : "deleteBookingR2",
      write: async (password: string, id: string) =>
        restaurant === "r1" ? deleteBookingR1(password, id) : deleteBookingR2(password, id),
      successToast: () => intl.formatMessage(staffCommonMessages.bookingDeleted),
    }),
  );
}
