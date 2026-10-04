import { useNavigate } from "@tanstack/react-router";
import { defineMessages } from "react-intl";

import { emailFailed } from "@/domain/bookings";
import type { PageSearchParams } from "@/domain/navigation";
import type { Restaurant, WriteResponse } from "@/domain/types";
import { focusCardDate } from "@/features/calendar/card-date-focus";
import { intl } from "@/intl/intl";
import { staffCommonMessages } from "@/intl/staff-messages";
import type { ToastKind } from "@/ui/feedback/toast";

// « + Ajouter une personne » (06 § 8): the form open is the search param `ajout` (`r1`, or `r2:{dish id}`, PLAN § 3.2),
// one at a time in the page. Sent by the public actions without password (`useBookR1`, `useOrderR2`): the answer is
// the public state, and mutations/bookings.ts reads the full state again while a session is open (06 § 8.5).

const messages = defineMessages<{
  partial: { count: number };
}>({
  partial: {
    id: "staff.addBooking.r2.partial",
    defaultMessage:
      "Personne ajoutée avec {count, plural, one {# portion} other {# portions}} seulement (stock restant).",
    description:
      "06 § 8.3, § 8.5 — toast de succès quand le script accorde moins de portions que demandé",
  },
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

/** Focus target of `requestFocus` (dish-focus.ts): the first field of the form opened by its button. */
export function addFormTarget(ajout: string): string {
  return `add:${ajout}`;
}

/**
 * Closes the form of `ajout` (`replace`) and gives the focus back to its « + Ajouter une personne » (E-48). The button
 * is gone when the last seat or portion was just taken: the date of the card takes the focus (03 § 5.4). Another form
 * opened meanwhile stays open.
 */
export function useCloseAddBooking(ajout: string) {
  const navigate = useNavigate();
  const restaurant: Restaurant = ajout === "r1" ? "r1" : "r2";
  return () => {
    const button = document.querySelector<HTMLElement>(`#${CSS.escape(addButtonId(ajout))}`);
    if (button === null) focusCardDate(restaurant);
    else button.focus({ preventScroll: true });
    void navigate({
      to: ".",
      search: (previous: PageSearchParams) =>
        previous.ajout === ajout ? { ...previous, ajout: undefined } : previous,
      replace: true,
      resetScroll: false,
    });
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
    return { text: intl.formatMessage(staffCommonMessages.personDuplicate), kind: "neutral" };
  }
  const success =
    granted !== undefined && granted.got < granted.asked
      ? intl.formatMessage(messages.partial, { count: granted.got })
      : intl.formatMessage(staffCommonMessages.personAdded);
  if (!emailFailed(response.emailStatus)) return { text: success, kind: "success" };
  // Two sentences, as the old page joined them (collegue.js, afterAddBooking).
  const failure = intl.formatMessage(staffCommonMessages.emailFailed);
  return { text: `${success} ${failure}`, kind: "error" };
}
