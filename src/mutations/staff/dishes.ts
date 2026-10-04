import { useMutation } from "@tanstack/react-query";
import { defineMessages } from "react-intl";

import { addItemR2, deleteItemR2, editItemR2 } from "@/api/actions";
import { intl } from "@/intl/intl";
import { staffWriteOptions } from "@/mutations/staff/write";

// Writes of the dishes of R2 (02 § 4.7, 06 § 6): `addItemR2`, `editItemR2`, `deleteItemR2`. The voucher mark goes into
// the name and a missing price becomes `""` at the API boundary (`api/actions.ts`, 06 § 4.3).

const messages = defineMessages({
  added: {
    id: "staff.dish.added",
    defaultMessage: "Plat ajouté.",
    description: "06 § 6.2, 02 § 4.7 — toast de succès de l'ajout d'un plat",
  },
  edited: {
    id: "staff.dish.edited",
    defaultMessage: "Plat modifié.",
    description: "06 § 6.3, 02 § 4.7 — toast de succès de la modification d'un plat",
  },
  deleted: {
    id: "staff.dish.deleted",
    defaultMessage: "Plat supprimé.",
    description: "06 § 5.2, § 6.4 — toast de succès de la suppression d'un plat",
  },
});

/** « Ajouter ce plat » (06 § 6.2): the script answers « Ce jour n'est pas ouvert. » for a deleted day. */
export function useAddDish() {
  return useMutation(
    staffWriteOptions({
      domain: "dishes",
      action: "add",
      write: addItemR2,
      successToast: () => intl.formatMessage(messages.added),
    }),
  );
}

/** « Enregistrer » of « Modifier ce plat » (06 § 6.3): « Plat introuvable. » for a deleted dish. */
export function useEditDish() {
  return useMutation(
    staffWriteOptions({
      domain: "dishes",
      action: "edit",
      write: editItemR2,
      successToast: () => intl.formatMessage(messages.edited),
    }),
  );
}

/** « Supprimer ce plat » (06 § 6.4): the bookings of the dish stay in the sheet, orphaned (06 § 5.2, b-3). */
export function useDeleteDish() {
  return useMutation(
    staffWriteOptions({
      domain: "dishes",
      action: "delete",
      write: deleteItemR2,
      successToast: () => intl.formatMessage(messages.deleted),
    }),
  );
}
