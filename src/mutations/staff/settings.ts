import { defineMessage } from "react-intl";

import { setConfigField } from "@/api/actions";
import { PasswordRejectedError } from "@/api/errors";
import type { FullState, SettingInput, SettingKey } from "@/domain/types";
import { adoptStaffState, useStaffWrite } from "@/mutations/staff/write";
import type { StaffWriteResult } from "@/mutations/staff/write";
import { useSessionStore } from "@/session/session";

// Writes of the settings (02 § 4.7, 06 § 2.2, D-20): one `setConfigField` per changed field, in sequence, in a single
// staff write (write.ts). A failure after the first field keeps the fields already saved: the full
// state they answered goes to the cache past the session guard.
const savedOneMessage = defineMessage({
  id: "staff.settings.savedOne",
  defaultMessage: "Paramètre enregistré.",
  description: "06 § 2.2 (5) — toast de succès, un seul champ enregistré",
});

const savedManyMessage = defineMessage({
  id: "staff.settings.savedMany",
  defaultMessage: "Paramètres enregistrés.",
  description: "06 § 2.2 (5) — toast de succès, plusieurs champs enregistrés",
});

/**
 * A request failed after at least one field was saved (D-20): `saved` keep their new value, `failed` (the refused
 * field and those not sent after it) keep the old one. `cause` is the error of the refused request.
 */
export class SettingsPartialFailureError extends Error {
  readonly saved: readonly SettingKey[];
  readonly failed: readonly SettingKey[];
  /** Last full state answered, and the session that sent the requests. */
  readonly result: StaffWriteResult;

  constructor(
    changes: readonly SettingInput[],
    index: number,
    cause: unknown,
    result: StaffWriteResult,
  ) {
    super("Settings partly saved.", { cause });
    this.name = "SettingsPartialFailureError";
    this.saved = changes.slice(0, index).map((change) => change.key);
    this.failed = changes.slice(index).map((change) => change.key);
    this.result = result;
  }
}

/**
 * Sends the changed settings one after the other (06 § 2.2 (4)): the requests never overlap. A failure on the first
 * field, or a refused password, rejects with the error of the request as is: the mutation cache closes the session on
 * a refused password (06 § 1.7).
 */
async function saveInSequence(
  password: string,
  changes: readonly SettingInput[],
): Promise<FullState> {
  // Read in the same tick as `mutationFn` of write.ts reads it.
  const { id } = useSessionStore.getState();
  let last: FullState | null = null;
  for (const [index, change] of changes.entries()) {
    try {
      last = await setConfigField(password, change);
    } catch (error) {
      if (last === null || error instanceof PasswordRejectedError) throw error;
      throw new SettingsPartialFailureError(changes, index, error, {
        state: last,
        sessionIdAtCall: id,
      });
    }
  }
  if (last === null) throw new Error("No setting to save.");
  return last;
}

/**
 * « Enregistrer les paramètres » (06 § 2.2): the variables are the changed fields (`changedSettings` of
 * domain/settings.ts), never empty. Toast « Paramètre enregistré. » or « Paramètres enregistrés. ».
 */
export function useSaveSettings() {
  return useStaffWrite(saveInSequence, {
    success: (changes) => (changes.length > 1 ? savedManyMessage : savedOneMessage),
    onError: async (error, _changes, _onMutateResult, { client }) => {
      if (error instanceof SettingsPartialFailureError) await adoptStaffState(client, error.result);
    },
  });
}
