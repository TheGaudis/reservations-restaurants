import type { IdentityValues } from "@/domain/bookings";
import { commonMessages } from "@/intl/common-messages";
import { intl } from "@/intl/intl";
import { staffCommonMessages } from "@/intl/staff-messages";
import { withFieldGroup } from "@/ui/form/app-form";

import styles from "@/features/staff/EditBookingForm.module.css";

// Fields shared by the two edit forms of a booking (06 § 7.2-7.4); their rules and the closing of the form are in
// edit-booking.ts, the buttons in FormActions.tsx.

const nameDefaults: Pick<IdentityValues, "name" | "className"> = { name: "", className: "" };

/** « Nom » and « Classe ou service » on one row (06 § 7.2-7.4), bound to the fields `name` and `className`. */
export const EditNameFields = withFieldGroup({
  defaultValues: nameDefaults,
  render: ({ group }) => (
    <div className={styles["row"]}>
      <group.AppField name="name">
        {(field) => (
          <field.TextField
            label={intl.formatMessage(staffCommonMessages.nameLabel)}
            autoComplete="off"
          />
        )}
      </group.AppField>
      <group.AppField name="className">
        {(field) => (
          <field.TextField
            label={intl.formatMessage(commonMessages.classLabel)}
            autoComplete="off"
          />
        )}
      </group.AppField>
    </div>
  ),
});

const contactDefaults: Pick<IdentityValues, "contact"> = { contact: "" };

/** « Téléphone ou email » (06 § 7.2), bound to the field `contact`: a phone number is allowed, no format check. */
export const EditContactField = withFieldGroup({
  defaultValues: contactDefaults,
  render: ({ group }) => (
    <group.AppField name="contact">
      {(field) => (
        <field.TextField
          label={intl.formatMessage(staffCommonMessages.contactLabel)}
          autoComplete="off"
          spellCheck={false}
        />
      )}
    </group.AppField>
  ),
});

const observationDefaults: Pick<IdentityValues, "observation"> = { observation: "" };

/** « Observation (optionnel) » (06 § 7.2), bound to the field `observation`. */
export const EditObservationField = withFieldGroup({
  defaultValues: observationDefaults,
  render: ({ group }) => (
    <group.AppField name="observation">
      {(field) => <field.TextField label={intl.formatMessage(commonMessages.observationLabel)} />}
    </group.AppField>
  ),
});
