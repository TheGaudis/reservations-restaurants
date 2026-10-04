import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

import { addBookingR1, addBookingR2Multi } from "@/api/actions";
import { BusinessError } from "@/api/errors";
import type { BookingR1Input, OrderR2Input, WriteResponse } from "@/domain/types";
import { bookingKeys } from "@/mutations/booking-keys";
import { stateKeys } from "@/queries/state";
import { useSessionStore } from "@/session/session";

// Bookings sent by the public forms and by « + Ajouter une personne » of the staff mode, without password
// (02 § 4.4, § 4.5; PLAN § 3.3.3). The cache is updated here, in `useMutation({ onSuccess })`, which runs even when
// the form is gone; the summary, toast, closing and focus belong to the form (`mutateAsync(input, { onSuccess })`).

// Writes go to the script one after the other (PLAN § 3.3).
const WRITE_SCOPE = { id: "write" };

/** Refusal of `addBookingR1` when the seats ran out (02 § 4.4, step 5): « Il ne reste que 2 couvert(s)… ». */
const SEATS_REFUSAL = /^Il ne reste que -?\d+ couvert\(s\) pour ce jour\.$/u;

/** The script refused an R1 booking for lack of seats: its message goes under the counters (a-5, E-35). */
export function isSeatsRefusal(error: unknown): error is BusinessError {
  return error instanceof BusinessError && SEATS_REFUSAL.test(error.message);
}

/**
 * Takes the public state of a booking answer (02 § 5.2): a read still running cannot overwrite it (PLAN § 3.3.2),
 * and the full state of a staff session is read again, since the answer only carries the public state.
 */
async function adoptBookingState(queryClient: QueryClient, response: WriteResponse) {
  await queryClient.cancelQueries({ queryKey: stateKeys.all() });
  queryClient.setQueryData(stateKeys.public(), response.state);
  if (useSessionStore.getState().password !== null) {
    await queryClient.invalidateQueries({ queryKey: stateKeys.staffAll() });
  }
}

/**
 * `addBookingR1` (02 § 4.4): sent once, never replayed (R-11); the input carries the `requestId` of the form
 * (invariant 3). After a refusal for lack of seats, the state is read again, so the legend « N au maximum » and
 * the rule of the counters follow (E-35).
 */
export function useBookR1() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: bookingKeys.r1(),
    scope: WRITE_SCOPE,
    mutationFn: async (input: BookingR1Input) => addBookingR1(input),
    onSuccess: async (response) => adoptBookingState(queryClient, response),
    onError: (error) => {
      if (isSeatsRefusal(error)) void queryClient.invalidateQueries({ queryKey: stateKeys.all() });
    },
  });
}

/**
 * `addBookingR2Multi` (02 § 4.5), public order and person added by a colleague: same cache update as R1. The form
 * reads the outcome (`orderOutcome`: duplicate, nothing confirmed, confirmed) from the answer.
 * @public used by the R2 order form from P4 (d)
 */
export function useOrderR2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: bookingKeys.r2(),
    scope: WRITE_SCOPE,
    mutationFn: async (input: OrderR2Input) => addBookingR2Multi(input),
    onSuccess: async (response) => adoptBookingState(queryClient, response),
  });
}
