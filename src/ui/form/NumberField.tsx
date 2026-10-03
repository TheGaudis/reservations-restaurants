import { Field } from "@base-ui/react/field";
import { NumberField as BaseNumberField } from "@base-ui/react/number-field";
import type { ReactNode } from "react";
import { defineMessages, useIntl } from "react-intl";

import { FieldMessages } from "@/ui/form/FieldMessages";
import { useFieldContext } from "@/ui/form/form-context";
import { useFieldMessages } from "@/ui/form/use-field-messages";

import styles from "@/ui/form/Field.module.css";
import numberStyles from "@/ui/form/NumberField.module.css";

const messages = defineMessages({
  roleDescription: {
    id: "ui.numberField.roleDescription",
    defaultMessage: "champ numérique",
    description:
      "D-17, R-16 — aria-roledescription du champ numérique (remplace « Number field » de Base UI)",
  },
});

// Glyphs of the −/+ buttons (D-17); the buttons are named by `decrementLabel` and `incrementLabel`.
const MINUS = "−";
const PLUS = "+";
// 04 § 5.2-5.3: an empty counter shows « 0 » in grey.
const PLACEHOLDER = "0";
// Whole numbers only (E-19); a typed fraction loses its decimals, as `parseInt` did (04 § 5.2: 2,7 → 2).
const WHOLE_NUMBER: Intl.NumberFormatOptions = {
  maximumFractionDigits: 0,
  roundingMode: "trunc",
  useGrouping: false,
};

/** A press on +, or ↑ / Page ↑ in the input. */
function isStepUp(details: BaseNumberField.Root.ChangeEventDetails) {
  if (details.reason === "increment-press") return true;
  const { event } = details;
  return (
    details.reason === "keyboard" &&
    event instanceof KeyboardEvent &&
    (event.key === "ArrowUp" || event.key === "PageUp")
  );
}

export interface NumberFieldProps {
  label: ReactNode;
  /** The quantity of a dish has no visible label (04 § 5.3: `aria-label="Quantité : {Nom}"`). */
  hideLabel?: boolean | undefined;
  description?: ReactNode;
  /** Name of the − button, in French (D-17: « Diminuer : Élèves », « Retirer une portion : Bowl »). */
  decrementLabel: string;
  /** Name of the + button (D-17: « Augmenter : Élèves », « Ajouter une portion : Bowl »). */
  incrementLabel: string;
  /** Lowest value of the buttons, the arrow keys and a typed value; defaults to 0. */
  min?: number | undefined;
  /** Highest value (remaining stock of a dish, D-18); none for the R1 counters, checked as a total. */
  max?: number | undefined;
  disabled?: boolean | undefined;
}

/**
 * Whole number between − and + buttons (D-17), bound to a `number | null` field. An emptied field holds `null`,
 * shows nothing and counts as 0 for the form (06 § 7.3: counters of the bookings made before the prices).
 * The buttons stay out of the tab order (Base UI): the arrow keys step the value from the keyboard.
 */
export function NumberField({
  label,
  hideLabel = false,
  description,
  decrementLabel,
  incrementLabel,
  min = 0,
  max,
  disabled = false,
}: NumberFieldProps) {
  const intl = useIntl();
  const field = useFieldContext<number | null>();
  const fieldMessages = useFieldMessages(field);
  return (
    <Field.Root
      name={field.name}
      invalid={fieldMessages.invalid}
      touched={field.state.meta.isTouched}
      dirty={field.state.meta.isDirty}
      disabled={disabled}
      className={styles["field"]}
    >
      <BaseNumberField.Root
        value={field.state.value}
        onValueChange={(value, details) => {
          // Base UI seeds an empty field with 0 on the first step; empty counts as 0 here, so + goes to 1.
          const fromEmpty = field.state.value === null && isStepUp(details);
          field.handleChange(
            fromEmpty ? Math.min(Math.max(1, min), max ?? Number.POSITIVE_INFINITY) : value,
          );
        }}
        min={min}
        max={max}
        step={1}
        locale="fr-FR"
        format={WHOLE_NUMBER}
      >
        <Field.Label className={hideLabel ? "visually-hidden" : styles["label"]}>
          {label}
        </Field.Label>
        <BaseNumberField.Group className={numberStyles["group"]}>
          <BaseNumberField.Decrement className={numberStyles["step"]} aria-label={decrementLabel}>
            <span aria-hidden="true">{MINUS}</span>
          </BaseNumberField.Decrement>
          <BaseNumberField.Input
            className={`${styles["control"]} ${numberStyles["input"]}`}
            placeholder={PLACEHOLDER}
            aria-roledescription={intl.formatMessage(messages.roleDescription)}
            aria-describedby={fieldMessages.describedBy}
            onBlur={field.handleBlur}
          />
          <BaseNumberField.Increment className={numberStyles["step"]} aria-label={incrementLabel}>
            <span aria-hidden="true">{PLUS}</span>
          </BaseNumberField.Increment>
        </BaseNumberField.Group>
      </BaseNumberField.Root>
      <FieldMessages messages={fieldMessages} description={description} />
    </Field.Root>
  );
}
