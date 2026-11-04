import { useMutation, useQueryClient } from "@tanstack/react-query";
import { defineMessage } from "react-intl";

import { addDayR1, addDayR2, deleteDayR1, deleteDayR2, editDayR1 } from "@/api/actions";
import { BusinessError, PasswordRejectedError } from "@/api/errors";
import type { IsoDate, Restaurant } from "@/domain/types";
import { intl } from "@/intl/intl";
import { staffWriteOptions } from "@/mutations/staff/write";
import { stateKeys } from "@/queries/state";

const dayAddedMessage = defineMessage({
  id: "staff.openDay.success",
  defaultMessage: "Jour ajouté.",
  description: "06 § 4.1, § 4.2 — toast de succès de « Ouvrir un jour »",
});

const dayDeletedMessage = defineMessage({
  id: "staff.day.deleted",
  defaultMessage: "Jour supprimé.",
  description: "06 § 5.2 — toast de succès d'une suppression de jour (R1 et R2)",
});

// Writes of the days (02 § 4.7, 06 § 4-5): `addDayR1`, `addDayR2`, `editDayR1`, `deleteDayR1`, `deleteDayR2`, one
// hook each built with `staffWriteOptions` (write.ts), which reads the password from the store and guards the session.
const dayEditedMessage = defineMessage({
  id: "staff.editDay.success",
  defaultMessage: "Jour modifié.",
  description: "06 § 5.1, 02 § 4.7 — toast de succès de « Modifier ce jour »",
});

/** « Ouvrir ce jour » of R1 (06 § 4.1): « Jour ajouté. ». */
export function useOpenDayR1() {
  return useMutation(
    staffWriteOptions({
      domain: "days",
      action: "openR1",
      write: addDayR1,
      successToast: () => intl.formatMessage(dayAddedMessage),
    }),
  );
}

/** « Ouvrir ce jour » of R2 with its dishes (06 § 4.2): « Jour ajouté. ». */
export function useOpenDayR2() {
  return useMutation(
    staffWriteOptions({
      domain: "days",
      action: "openR2",
      write: addDayR2,
      successToast: () => intl.formatMessage(dayAddedMessage),
    }),
  );
}

/**
 * « Modifier ce jour » (06 § 5.1): « Jour modifié. ». A refusal of the script (capacity under the seats booked)
 * reads the state again, so the form checks the new count (a-4).
 */
export function useEditDayR1() {
  const queryClient = useQueryClient();
  return useMutation({
    ...staffWriteOptions({
      domain: "days",
      action: "editR1",
      write: editDayR1,
      successToast: () => intl.formatMessage(dayEditedMessage),
    }),
    onError: (error) => {
      if (error instanceof BusinessError && !(error instanceof PasswordRejectedError)) {
        void queryClient.invalidateQueries({ queryKey: stateKeys.all() });
      }
    },
  });
}

/** « Supprimer ce jour » (06 § 5.2): the script deletes the day and its bookings (R2: its dishes too), « Jour supprimé. ». */
export function useDeleteDay(restaurant: Restaurant) {
  return useMutation(
    staffWriteOptions<IsoDate>({
      domain: "days",
      action: restaurant === "r1" ? "deleteR1" : "deleteR2",
      write: restaurant === "r1" ? deleteDayR1 : deleteDayR2,
      successToast: () => intl.formatMessage(dayDeletedMessage),
    }),
  );
}
