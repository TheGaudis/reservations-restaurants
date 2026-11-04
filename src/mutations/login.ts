import { useMutation, useQueryClient } from "@tanstack/react-query";

import { fetchFullState } from "@/api/state";
import { stateKeys } from "@/queries/state";
import { useSessionStore } from "@/session/session";

// Staff login (06 § 1.3, 02 § 4.3, PLAN § 3.3.3): the only staff mutation of the public chunk, imported by the mode
// switch of the header. Everything else of the staff mode loads with the /collegue route.

/** Mutation key of the login (PLAN § 3.3.3): no password in it. */
const LOGIN_KEY = ["login"] as const;

/**
 * `getAdminState` with the typed password, sent as is (no trim, empty accepted, 06 § 1.3): one request checks the
 * password and answers the full state. On success the full state goes into the cache under the next session number,
 * then the session opens: the page switches from the public to the full state without suspending (PLAN § 3.4).
 * A refusal rejects with `PasswordRejectedError` (`Mot de passe incorrect.`), any other failure with its own error.
 *
 * The password is the mutation's variable: `gcTime: 0` drops the mutation from the cache once its observer lets it
 * go (`reset()`, unmount), so a wrong password does not stay in memory (invariant 1).
 */
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: LOGIN_KEY,
    mutationFn: async (password: string) => fetchFullState(password),
    gcTime: 0,
    onSuccess: (state, password) => {
      const session = useSessionStore.getState();
      queryClient.setQueryData(stateKeys.staff(session.id + 1), state);
      session.open(password);
    },
  });
}
