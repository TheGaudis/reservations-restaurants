import { useSelector } from "@tanstack/react-form";

import { DayActions } from "@/features/calendar/DayCard";
import { usePageNavigate, usePageSearch } from "@/features/calendar/page-search";
import { addButtonId, addFormId, addFormTarget } from "@/features/staff/add-booking";
import { requestFocus } from "@/features/staff/dish-focus";
import { commonMessages } from "@/intl/common-messages";
import { intl } from "@/intl/intl";
import { staffCommonMessages } from "@/intl/staff-messages";
import { Button } from "@/ui/button/Button";
import { useFormContext } from "@/ui/form/form-context";
import { SubmitButton } from "@/ui/form/SubmitButton";

// Parts shared by the R1 and R2 forms « Ajouter une personne » (06 § 8).

interface AddPersonButtonProps {
  /** Value of `ajout` that the button opens (`r1`, `r2:{dish id}`). */
  ajout: string;
}

/**
 * « + Ajouter une personne » (small, 06 § 8): opens its form in `push`, focus on « Nom et prénom » (04 § 5.1). Stays in
 * the page while the form is open (`aria-expanded`, 05 § 5.3), and takes the focus back when it closes (E-48). A second
 * click leaves the open form as it is.
 */
export function AddPersonButton({ ajout }: AddPersonButtonProps) {
  const search = usePageSearch();
  const navigate = usePageNavigate();
  const open = search.ajout === ajout;
  return (
    <Button
      id={addButtonId(ajout)}
      size="small"
      aria-expanded={open}
      aria-controls={open ? addFormId(ajout) : undefined}
      onClick={() => {
        if (open) return;
        requestFocus(addFormTarget(ajout));
        navigate({ ...search, ajout }, { replace: false });
      }}
    >
      {intl.formatMessage(staffCommonMessages.addPerson)}
    </Button>
  );
}

/**
 * « Ajouter cette personne » (busy: « Ajout en cours… ») and « Annuler », disabled while sending (E-13), inside the
 * `Form` of an addition (06 § 8.2, § 8.3).
 */
export function AddBookingActions({ onCancel }: { onCancel: () => void }) {
  const form = useFormContext();
  const sending = useSelector(form.store, (state) => state.isSubmitting);
  return (
    <DayActions>
      <SubmitButton pendingLabel={intl.formatMessage(staffCommonMessages.adding)}>
        {intl.formatMessage(staffCommonMessages.addPersonSubmit)}
      </SubmitButton>
      <Button variant="ghost" disabled={sending} onClick={onCancel}>
        {intl.formatMessage(commonMessages.cancel)}
      </Button>
    </DayActions>
  );
}
