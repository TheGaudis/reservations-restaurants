import { defineMessage } from "react-intl";

import { emailFailed } from "@/domain/bookings";
import type { Restaurant, WriteResponse } from "@/domain/types";
import { focusCardDate } from "@/features/calendar/card-date-focus";
import { useCloseForm } from "@/features/calendar/page-search";
import { intl } from "@/intl/intl";
import type { ToastKind } from "@/ui/feedback/toast";
import { focusById } from "@/ui/pending-focus";

const personAddedMessage = defineMessage({
  id: "staff.addBooking.success",
  defaultMessage: "Personne ajoutée.",
  description: "06 § 8.5 — toast de succès de l'ajout d'une personne",
});

const personDuplicateMessage = defineMessage({
  id: "staff.addBooking.duplicate",
  defaultMessage:
    "Cette personne était déjà enregistrée : elle n'a pas été ajoutée une seconde fois.",
  description: "06 § 8.5 — toast neutre d'un ajout en doublon (_duplicate)",
});

const emailFailedMessage = defineMessage({
  id: "staff.addBooking.emailFailed",
  defaultMessage: "L'email de confirmation n'a pas pu être envoyé.",
  description: "06 § 8.5 — suite du toast quand l'email de confirmation n'est pas parti",
});

// « + Ajouter une personne » (06 § 8): the form open is the search param `ajout` (`r1`, or `r2:{dish id}`, PLAN § 3.2),
// one at a time in the page. Sent by the public actions without password (`useBookR1`, `useOrderR2`): the answer is
// the public state, and mutations/bookings.ts reads the full state again while a session is open (06 § 8.5).
const partialMessage = defineMessage<{ count: number }>({
  id: "staff.addBooking.r2.partial",
  defaultMessage:
    "Personne ajoutée avec {count, plural, one {# portion} other {# portions}} seulement (stock restant).",
  description:
    "06 § 8.3, § 8.5 — toast de succès quand le script accorde moins de portions que demandé",
});

/** Value of `ajout` for the R1 card, or for a dish of the R2 card. */
export function ajoutValue(dishId?: string): string {
  return dishId === undefined ? "r1" : `r2:${dishId}`;
}

/** Id of « + Ajouter une personne » (one staff card per restaurant in the page): the focus comes back to it (E-48). */
export function addButtonId(ajout: string): string {
  return `add-person-${ajout.replace(":", "-")}`;
}

/** Id of the form, for `aria-controls` of its button. */
export function addFormId(ajout: string): string {
  return `add-person-form-${ajout.replace(":", "-")}`;
}

/** Focus key (ui/pending-focus.ts) of the form opened by its button: its first field takes the focus. */
export function addFormTarget(ajout: string): string {
  return `add:${ajout}`;
}

/**
 * Closes the form of `ajout` (`replace`) and gives the focus back to its « + Ajouter une personne » (E-48). The button
 * is gone when the last seat or portion was just taken: the date of the card takes the focus (03 § 5.4). Another form
 * opened meanwhile stays open.
 */
export function useCloseAddBooking(ajout: string) {
  const closeForm = useCloseForm();
  const restaurant: Restaurant = ajout === "r1" ? "r1" : "r2";
  return () => {
    if (!focusById(addButtonId(ajout))) focusCardDate(restaurant);
    closeForm((previous) =>
      previous.ajout === ajout ? { ...previous, ajout: undefined } : previous,
    );
  };
}

/** Toast after a person was added (06 § 8.5). */
export interface AddedToast {
  text: string;
  kind: ToastKind;
}

/**
 * Toast of 06 § 8.5: a duplicate says so without being an error; else « Personne ajoutée. », or the partial R2 message
 * when the script granted fewer portions than asked (`granted`), followed by « L'email de confirmation n'a pas pu être
 * envoyé. » in the error style when the e-mail failed (`no-email` is not a failure).
 */
export function addedToast(
  response: WriteResponse,
  granted?: { asked: number; got: number },
): AddedToast {
  if (response.duplicate) {
    return { text: intl.formatMessage(personDuplicateMessage), kind: "neutral" };
  }
  const success =
    granted !== undefined && granted.got < granted.asked
      ? intl.formatMessage(partialMessage, { count: granted.got })
      : intl.formatMessage(personAddedMessage);
  if (!emailFailed(response.emailStatus)) return { text: success, kind: "success" };
  // Two sentences, as the old page joined them (collegue.js, afterAddBooking).
  const failure = intl.formatMessage(emailFailedMessage);
  return { text: `${success} ${failure}`, kind: "error" };
}
