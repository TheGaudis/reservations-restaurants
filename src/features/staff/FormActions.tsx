import { useSelector } from "@tanstack/react-form";
import { FormattedMessage } from "react-intl";

import { DayActions } from "@/features/calendar/DayCard";
import { commonMessages } from "@/intl/common-messages";
import { intl } from "@/intl/intl";
import { Button } from "@/ui/button/Button";
import { useFormContext } from "@/ui/form/form-context";
import { SubmitButton } from "@/ui/form/SubmitButton";

interface FormActionsProps {
  onCancel: () => void;
  /** Defaults to « Enregistrer » (06 § 7.3). */
  submitLabel?: string;
  /** Defaults to « Enregistrement… » (08 § 4.2). */
  pendingLabel?: string;
}

/** Submit button and « Annuler », disabled while sending (E-13), inside the `Form` of a staff form. */
export function FormActions({
  onCancel,
  submitLabel = intl.formatMessage(commonMessages.save),
  pendingLabel = intl.formatMessage(commonMessages.saving),
}: FormActionsProps) {
  const form = useFormContext();
  const sending = useSelector(form.store, (state) => state.isSubmitting);
  return (
    <DayActions>
      <SubmitButton pendingLabel={pendingLabel}>{submitLabel}</SubmitButton>
      <Button variant="ghost" disabled={sending} onClick={onCancel}>
        <FormattedMessage {...commonMessages.cancel} />
      </Button>
    </DayActions>
  );
}
