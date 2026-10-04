import { mutationOptions } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

import { errorMessage, PasswordRejectedError } from "@/api/errors";
import type { FullState } from "@/domain/types";
import { intl } from "@/intl/intl";
import { staffCommonMessages } from "@/intl/staff-messages";
import { WRITE_SCOPE } from "@/mutations/booking-keys";
import { stateKeys } from "@/queries/state";
import { useSessionStore } from "@/session/session";
import { showToast } from "@/ui/feedback/toast";

// Writes of the staff mode (02 § 4.7, PLAN § 3.3.3): one factory for days, dishes, bookings and settings. The password
// and the session number are read from the store when the write starts, never passed by a component. The answer (the
// full state) reaches the cache only while that same session is still open: a write answered after a logout writes
// nothing and shows nothing (session guard, F-02, E-55, invariant 1).

/** File of `mutations/staff/` that owns the action. */
export type StaffWriteDomain = "days" | "dishes" | "bookings" | "settings";

/**
 * `['write', domain, action]` (PLAN § 3.3): never a password nor a name in it.
 * @internal exported for its tests only (knip --production)
 */
export function staffWriteKey(domain: StaffWriteDomain, action: string) {
  return ["write", domain, action] as const;
}

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

export interface StaffWriteConfig<TVariables> {
  domain: StaffWriteDomain;
  /** Name of the action in the key: `openR1`, `editBookingR2`, `save`… */
  action: string;
  /** Call of `api/actions.ts` (or a sequence of calls) with the password of the session; resolves the last full state. */
  write: (password: string, variables: TVariables) => Promise<FullState>;
  /** Success toast of 02 § 4.7 (« Jour ajouté. »…), formatted with `intl` of `intl/intl.ts`; shown only past the guard. */
  successToast?: (variables: TVariables) => string;
}

/**
 * Options of a staff write, for `useMutation(staffWriteOptions({ … }))` in a hook of `mutations/staff/`. Sent once,
 * never replayed (R-11). A refused password closes the session through the mutation cache (06 § 1.7). The form calls
 * `mutateAsync(variables, { onSuccess })` in a `try/catch` of its `onSubmit`: closing, focus (E-48) and field errors
 * belong to it, `staffErrorText` words the failures.
 */
export function staffWriteOptions<TVariables>({
  domain,
  action,
  write,
  successToast,
}: StaffWriteConfig<TVariables>) {
  return mutationOptions({
    mutationKey: staffWriteKey(domain, action),
    scope: WRITE_SCOPE,
    mutationFn: async (variables: TVariables): Promise<StaffWriteResult> => {
      const { password, id } = useSessionStore.getState();
      if (password === null) throw new Error("Staff write without an open staff session.");
      return { state: await write(password, variables), sessionIdAtCall: id };
    },
    onSuccess: async (result, variables, _onMutateResult, { client }) => {
      const adopted = await adoptStaffState(client, result);
      if (adopted && successToast !== undefined) {
        showToast(successToast(variables), "success");
      }
    },
  });
}

/**
 * Text of a failed staff write: the script's message as is (02 § 4.7), otherwise the staff text of D-14. Null for a
 * refused password: the logout already says « Le mot de passe du mode collègue a changé. Reconnectez-vous. » (06 § 1.7).
 */
export function staffErrorText(error: unknown): string | null {
  if (error instanceof PasswordRejectedError) return null;
  return errorMessage(error) ?? intl.formatMessage(staffCommonMessages.serviceUnavailable);
}
