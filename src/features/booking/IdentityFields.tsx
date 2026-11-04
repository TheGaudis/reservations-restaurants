import { defineMessage } from "react-intl";

import type { IdentityValues } from "@/domain/bookings";
import type { IdentityVariant } from "@/features/booking/identity-rules";
import { classLabel, observationLabel } from "@/intl/common-messages";
import { intl } from "@/intl/intl";
import { withFieldGroup } from "@/ui/form/app-form";

import styles from "@/features/booking/IdentityFields.module.css";

const nameLabel = defineMessage({
  id: "common.form.name.label",
  defaultMessage: "Nom et prénom",
  description: "04 § 5.2, 06 § 8.1 — libellé du nom (formulaires publics, ajout d'une personne)",
});

const namePlaceholder = defineMessage({
  id: "common.form.name.placeholder",
  defaultMessage: "Ex. Cyrille Ungerer",
  description: "04 § 5.2, 06 § 8.1 — exemple du champ nom",
});

const classPlaceholder = defineMessage({
  id: "common.form.className.placeholder",
  defaultMessage: "Ex. TS2 ou vie scolaire",
  description: "04 § 5.2, 06 § 8.1 — exemple du champ classe",
});

const emailPlaceholder = defineMessage({
  id: "common.form.email.placeholder",
  defaultMessage: "Ex. Ariele.gsell@exemple.fr",
  description: "04 § 5.2, 06 § 8.1 — exemple du champ email",
});

const observationPlaceholder = defineMessage({
  id: "common.form.observation.placeholder",
  defaultMessage: "Ex. table partagée, allergie…",
  description: "04 § 5.2, 06 § 8.1 — exemple du champ observation",
});

const emailOptionalLabel = defineMessage({
  id: "staff.addBooking.email.label",
  defaultMessage: "Adresse email (optionnel)",
  description: "06 § 8.1 — libellé de l'email de l'ajout d'une personne",
});

const emailOptionalHelp = defineMessage({
  id: "staff.addBooking.email.help",
  defaultMessage: "Si elle est indiquée, la confirmation y est envoyée.",
  description: "06 § 8.1 — aide de l'email de l'ajout d'une personne",
});

const emailLabel = defineMessage({
  id: "public.form.email.label",
  defaultMessage: "Adresse email",
  description: "04 § 5.2-5.3 — libellé de l'adresse email (formulaires publics R1 et R2)",
});

const emailHelp = defineMessage({
  id: "public.form.email.help",
  defaultMessage: "Pour vous envoyer la confirmation.",
  description: "04 § 5.2, § 9 — aide sous l'adresse email (formulaires publics R1 et R2)",
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
            label={intl.formatMessage(nameLabel)}
            placeholder={intl.formatMessage(namePlaceholder)}
            autoComplete={isPublic ? "name" : "off"}
          />
        )}
      </group.AppField>
    );
    const contact = (
      <group.AppField name="contact">
        {(field) => (
          <field.TextField
            label={intl.formatMessage(isPublic ? emailLabel : emailOptionalLabel)}
            description={intl.formatMessage(isPublic ? emailHelp : emailOptionalHelp)}
            type="email"
            inputMode="email"
            spellCheck={false}
            autoComplete={isPublic ? "email" : "off"}
            placeholder={intl.formatMessage(emailPlaceholder)}
          />
        )}
      </group.AppField>
    );
    const className = (
      <group.AppField name="className">
        {(field) => (
          <field.TextField
            label={intl.formatMessage(classLabel)}
            placeholder={intl.formatMessage(classPlaceholder)}
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
          label={intl.formatMessage(observationLabel)}
          placeholder={intl.formatMessage(observationPlaceholder)}
        />
      )}
    </group.AppField>
  ),
});
