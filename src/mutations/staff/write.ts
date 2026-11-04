import { mutationOptions, useMutation } from "@tanstack/react-query";
import type { MutationFunctionContext, QueryClient } from "@tanstack/react-query";
import { defineMessage } from "react-intl";
import type { MessageDescriptor } from "react-intl";

import { BusinessError, errorMessage, PasswordRejectedError } from "@/api/errors";
import type { FullState } from "@/domain/types";
import { intl } from "@/intl/intl";
import { WRITE_SCOPE } from "@/mutations/booking-keys";
import { stateKeys } from "@/queries/state";
import { useSessionStore } from "@/session/session";
import { showToast } from "@/ui/feedback/toast";

const staffServiceUnavailableMessage = defineMessage({
  id: "staff.error.serviceUnavailable",
  defaultMessage: "Le service ne répond pas. Réessayez dans un instant.",
  description:
    "PLAN annexe F, D-14 — écriture collègue (ajout d'une personne compris) sans réponse",
});

// Writes of the staff mode (02 § 4.7, PLAN § 3.3.3): days, dishes, bookings and settings. The password and the session
// number are read from the store when the write starts, never passed by a component. The answer (the full state)
// reaches the cache only while that same session is still open: a write answered after a logout writes nothing and
// shows nothing (session guard, F-02, E-55, invariant 1).

/** Key of every staff write (PLAN § 3.3): never a password nor a name in it. */
export const STAFF_WRITE_KEY = ["write", "staff"] as const;

/** What a staff write resolves with: the full state answered, and the session that sent it. */
export interface StaffWriteResult {
  state: FullState;
  /** `session.id` when the write started (PLAN § 3.3.3). */
  sessionIdAtCall: number;
}

/** The session that sent a write is still the open one (PLAN § 3.3.3). */
function isSessionOpen(sessionIdAtCall: number): boolean {
  const { password, id } = useSessionStore.getState();
  return password !== null && id === sessionIdAtCall;
}

/**
 * Session guard, then the cache (PLAN § 3.3.3): a read still running cannot overwrite the answer (§ 3.3.2), the full
 * state of the session takes the answer, the public state is marked stale without being read (the staff page shows the
 * full state; the logout reads the public state again). Resolves false, having written nothing, when the session that
 * sent the write is gone. Exported for a write that keeps part of its work on failure (settings, D-20).
 */
export async function adoptStaffState(
  queryClient: QueryClient,
  { state, sessionIdAtCall }: StaffWriteResult,
): Promise<boolean> {
  if (!isSessionOpen(sessionIdAtCall)) return false;
  await queryClient.cancelQueries({ queryKey: stateKeys.all() });
  // The session may have closed while the reads were being cancelled.
  if (!isSessionOpen(sessionIdAtCall)) return false;
  queryClient.setQueryData(stateKeys.staff(sessionIdAtCall), state);
  void queryClient.invalidateQueries({ queryKey: stateKeys.public(), refetchType: "none" });
  return true;
}

/** Call of `api/actions.ts` (or a sequence of calls) with the password of the session; resolves the last full state. */
export type StaffWrite<TVariables> = (
  password: string,
  variables: TVariables,
) => Promise<FullState>;

export interface StaffWriteOptions<TVariables> {
  /** Success toast of 02 § 4.7 (« Jour ajouté. »…), shown only past the session guard. */
  success?: MessageDescriptor | ((variables: TVariables) => MessageDescriptor);
  /** `onError` of the mutation, which runs even when the form is gone (`readStateAgainOn`, D-20). */
  onError?: (
    error: Error,
    variables: TVariables,
    onMutateResult: unknown,
    context: MutationFunctionContext,
  ) => unknown;
}

/**
 * Options of a staff write: sent once, never replayed (R-11), in the scope of every write. A refused password closes
 * the session through the mutation cache (06 § 1.7).
 */
export function staffWriteOptions<TVariables>(
  write: StaffWrite<TVariables>,
  { success, onError }: StaffWriteOptions<TVariables> = {},
) {
  return mutationOptions({
    mutationKey: STAFF_WRITE_KEY,
    scope: WRITE_SCOPE,
    mutationFn: async (variables: TVariables): Promise<StaffWriteResult> => {
      const { password, id } = useSessionStore.getState();
      if (password === null) throw new Error("Staff write without an open staff session.");
      return { state: await write(password, variables), sessionIdAtCall: id };
    },
    onSuccess: async (result, variables, _onMutateResult, { client }) => {
      const adopted = await adoptStaffState(client, result);
      if (!adopted || success === undefined) return;
      const message = typeof success === "function" ? success(variables) : success;
      showToast(intl.formatMessage(message), "success");
    },
    ...(onError === undefined ? {} : { onError }),
  });
}

/**
 * A staff write: `const write = useStaffWrite(addDayR1, { success: dayAddedMessage })`. The form calls
 * `write.mutateAsync(variables, { onSuccess })` in a `try/catch` of its `onSubmit`: closing, focus (E-48) and field
 * errors belong to it, `staffErrorText` words the failures.
 */
export function useStaffWrite<TVariables>(
  write: StaffWrite<TVariables>,
  options?: StaffWriteOptions<TVariables>,
) {
  return useMutation(staffWriteOptions(write, options));
}

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

/** A refusal of the script other than the password, which the logout handles (06 § 1.7). */
export function isBusinessRefusal(error: unknown): error is BusinessError {
  return error instanceof BusinessError && !(error instanceof PasswordRejectedError);
}

/**
 * Text of a failed staff write: the script's message as is (02 § 4.7), otherwise the staff text of D-14. Null for a
 * refused password: the logout already says « Le mot de passe du mode collègue a changé. Reconnectez-vous. » (06 § 1.7).
 */
export function staffErrorText(error: unknown): string | null {
  if (error instanceof PasswordRejectedError) return null;
  return errorMessage(error) ?? intl.formatMessage(staffServiceUnavailableMessage);
}

/** Error toast of a failed staff write (`staffErrorText`); nothing for a refused password. */
export function showStaffError(error: unknown): void {
  const text = staffErrorText(error);
  if (text !== null) showToast(text, "error");
}
