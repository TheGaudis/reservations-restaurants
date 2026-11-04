import { Field } from "@base-ui/react/field";
import { useId } from "react";
import type { ReactNode } from "react";

import { FieldShell, useFieldMessages } from "@/ui/form/FieldShell";
import { useFieldContext } from "@/ui/form/form-context";

import styles from "@/ui/form/Field.module.css";

const NO_SUGGESTIONS: readonly string[] = [];

export interface PriceFieldProps {
  label: ReactNode;
  /** The price of a line of « Ouvrir un jour » R2 has no visible label (06 § 4.2). */
  hideLabel?: boolean | undefined;
  description?: ReactNode;
  /** « Ex. 3,50 », or « Ticket » for a dish paid by a meal voucher (06 § 4.3). */
  placeholder?: string | undefined;
  /** Prices already used by the dishes, as typed (« 3,50 »), offered by a `<datalist>` (06 § 6.1). */
  suggestions?: readonly string[] | undefined;
  /** The price of a dish paid by a meal voucher is cleared and disabled (06 § 4.3). */
  disabled?: boolean | undefined;
}

/**
 * Price in euros bound to a string field: the text as typed, decimal comma accepted, read by `parseAmount` when the
 * form checks or sends it. A text input, because Base UI's NumberField takes no `<datalist>` (R-16).
 */
export function PriceField({
  label,
  hideLabel = false,
  description,
  placeholder,
  suggestions = NO_SUGGESTIONS,
  disabled = false,
}: PriceFieldProps) {
  const field = useFieldContext<string>();
  const fieldMessages = useFieldMessages(field);
  const listId = useId();
  const hasSuggestions = suggestions.length > 0;
  return (
    <FieldShell
      field={field}
      messages={fieldMessages}
      description={description}
      disabled={disabled}
    >
      <Field.Label className={hideLabel ? "visually-hidden" : styles["label"]}>{label}</Field.Label>
      <Field.Control
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        list={hasSuggestions ? listId : undefined}
        className={styles["control"]}
        value={field.state.value}
        onValueChange={(value) => {
          field.handleChange(value);
        }}
        onBlur={field.handleBlur}
        aria-describedby={fieldMessages.describedBy}
      />
      {hasSuggestions ? (
        <datalist id={listId}>
          {suggestions.map((price) => (
            <option key={price} value={price}>
              {price}
            </option>
          ))}
        </datalist>
      ) : null}
    </FieldShell>
  );
}
