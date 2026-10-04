import { defineMessages } from "react-intl";

import type { IdentityValues } from "@/domain/bookings";
import { compose, email, required } from "@/domain/validation";
import { commonMessages } from "@/intl/common-messages";
import { intl } from "@/intl/intl";
import { staffCommonMessages } from "@/intl/staff-messages";

/**
 * Wording of the identity fields: the public booking forms (04 § 5.2-5.3), or a person added by a colleague
 * (06 § 8.1, e-mail optional).
 */
export type IdentityVariant = "public" | "staffAdd";

/** Fields checked by `identityErrors`; the observation is optional everywhere. */
export type IdentityKey = "name" | "contact" | "className";

const messages = defineMessages({
  nameRequired: {
    id: "public.form.name.required",
    defaultMessage: "Indiquez vos nom et prénom.",
    description: "04 § 5.2, § 9 — nom vide (formulaires publics R1 et R2)",
  },
  emailRequired: {
    id: "public.form.email.required",
    defaultMessage: "Indiquez votre adresse email.",
    description: "04 § 5.2, § 9 — adresse email vide (formulaires publics R1 et R2)",
  },
  classRequired: {
    id: "public.form.className.required",
    defaultMessage: "Indiquez votre classe ou votre service.",
    description: "04 § 5.2, § 9 — classe vide (formulaires publics R1 et R2)",
  },
});

function publicRules(values: Pick<IdentityValues, IdentityKey>) {
  return {
    name: required(intl.formatMessage(messages.nameRequired))({ value: values.name }),
    contact: compose(
      required(intl.formatMessage(messages.emailRequired)),
      email(intl.formatMessage(commonMessages.emailInvalid)),
    )({ value: values.contact }),
    className: required(intl.formatMessage(messages.classRequired))({ value: values.className }),
  };
}

function staffAddRules(values: Pick<IdentityValues, IdentityKey>) {
  return {
    name: required(intl.formatMessage(staffCommonMessages.nameRequired))({ value: values.name }),
    contact: email(intl.formatMessage(commonMessages.emailInvalid))({ value: values.contact }),
    className: required(intl.formatMessage(staffCommonMessages.classRequired))({
      value: values.className,
    }),
  };
}

/**
 * Messages of the identity fields that break their rule (04 § 5.2, 06 § 8.1), keyed by field name: the part of a
 * form's `onDynamic` validator that `IdentityFields` shows. Texts are checked after `trim()`.
 */
export function identityErrors(
  values: Pick<IdentityValues, IdentityKey>,
  variant: IdentityVariant,
): Partial<Record<IdentityKey, string>> {
  const results = variant === "public" ? publicRules(values) : staffAddRules(values);
  const errors: Partial<Record<IdentityKey, string>> = {};
  for (const key of ["name", "contact", "className"] as const) {
    const message = results[key];
    if (message !== undefined) errors[key] = message;
  }
  return errors;
}
