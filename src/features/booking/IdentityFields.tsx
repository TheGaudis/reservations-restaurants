import { defineMessages } from "react-intl";

import type { IdentityValues } from "@/domain/bookings";
import type { IdentityVariant } from "@/features/booking/identity-rules";
import { commonMessages } from "@/intl/common-messages";
import { intl } from "@/intl/intl";
import { staffCommonMessages } from "@/intl/staff-messages";
import { withFieldGroup } from "@/ui/form/app-form";

import styles from "@/features/booking/IdentityFields.module.css";

const messages = defineMessages({
  emailLabel: {
    id: "public.form.email.label",
    defaultMessage: "Adresse email",
    description: "04 § 5.2-5.3 — libellé de l'adresse email (formulaires publics R1 et R2)",
  },
  emailHelp: {
    id: "public.form.email.help",
    defaultMessage: "Pour vous envoyer la confirmation.",
    description: "04 § 5.2, § 9 — aide sous l'adresse email (formulaires publics R1 et R2)",
  },
});

const identityDefaults: Pick<IdentityValues, "name" | "contact" | "className"> = {
  name: "",
  contact: "",
  className: "",
};

const identityProps: { variant: IdentityVariant } = { variant: "public" };

const observationDefaults: Pick<IdentityValues, "observation"> = { observation: "" };

/**
 * « Nom et prénom », « Adresse email », « Classe ou service » of a booking form, bound to the fields `name`,
 * `contact` and `className` of the form (`<IdentityFields form={form} fields={…} variant="public" />`). Public
 * forms (04 § 5.2-5.3): name, then e-mail and class on one row, e-mail required. Person added by a colleague
 * (06 § 8.1, 8.2): name and class on one row, then the optional e-mail. Rules: `identityErrors` in the form's
 * `onDynamic` validator.
 */
export const IdentityFields = withFieldGroup({
  defaultValues: identityDefaults,
  props: identityProps,
  render: ({ group, variant }) => {
    const isPublic = variant === "public";
    const name = (
      <group.AppField name="name">
        {(field) => (
          <field.TextField
            label={intl.formatMessage(commonMessages.nameLabel)}
            placeholder={intl.formatMessage(commonMessages.namePlaceholder)}
            autoComplete={isPublic ? "name" : "off"}
          />
        )}
      </group.AppField>
    );
    const contact = (
      <group.AppField name="contact">
        {(field) => (
          <field.TextField
            label={intl.formatMessage(
              isPublic ? messages.emailLabel : staffCommonMessages.emailOptionalLabel,
            )}
            description={intl.formatMessage(
              isPublic ? messages.emailHelp : staffCommonMessages.emailOptionalHelp,
            )}
            type="email"
            inputMode="email"
            spellCheck={false}
            autoComplete={isPublic ? "email" : "off"}
            placeholder={intl.formatMessage(commonMessages.emailPlaceholder)}
          />
        )}
      </group.AppField>
    );
    const className = (
      <group.AppField name="className">
        {(field) => (
          <field.TextField
            label={intl.formatMessage(commonMessages.classLabel)}
            placeholder={intl.formatMessage(commonMessages.classPlaceholder)}
          />
        )}
      </group.AppField>
    );
    if (isPublic) {
      return (
        <>
          {name}
          <div className={styles["row"]}>
            {contact}
            {className}
          </div>
        </>
      );
    }
    return (
      <>
        <div className={styles["row"]}>
          {name}
          {className}
        </div>
        {contact}
      </>
    );
  },
});

/** « Observation (optionnel) » of a booking form (04 § 5.2, 06 § 8.1), bound to its field `observation`. */
export const ObservationField = withFieldGroup({
  defaultValues: observationDefaults,
  render: ({ group }) => (
    <group.AppField name="observation">
      {(field) => (
        <field.TextField
          label={intl.formatMessage(commonMessages.observationLabel)}
          placeholder={intl.formatMessage(commonMessages.observationPlaceholder)}
        />
      )}
    </group.AppField>
  ),
});
