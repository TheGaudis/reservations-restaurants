import { useSelector } from "@tanstack/react-form";

import { DayActions } from "@/features/calendar/DayCard";
import { commonMessages } from "@/intl/common-messages";
import { intl } from "@/intl/intl";
import { Button } from "@/ui/button/Button";
import { useFormContext } from "@/ui/form/form-context";
import { SubmitButton } from "@/ui/form/SubmitButton";

/**
 * « Enregistrer » (busy: « Enregistrement… ») and « Annuler », disabled while sending (E-13), inside the `Form` of an
 * edit form (06 § 7.3, § 7.4).
 */
export function EditBookingActions({ onCancel }: { onCancel: () => void }) {
  const form = useFormContext();
  const sending = useSelector(form.store, (state) => state.isSubmitting);
  return (
    <DayActions>
      <SubmitButton pendingLabel={intl.formatMessage(commonMessages.saving)}>
        {intl.formatMessage(commonMessages.save)}
      </SubmitButton>
      <Button variant="ghost" disabled={sending} onClick={onCancel}>
        {intl.formatMessage(commonMessages.cancel)}
      </Button>
    </DayActions>
  );
}
