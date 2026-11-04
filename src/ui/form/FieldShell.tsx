import { Field } from "@base-ui/react/field";
import type { AnyFieldApi } from "@tanstack/react-form";
import { useId } from "react";
import type { ReactNode } from "react";

import { errorText } from "@/ui/form/errors";

import styles from "@/ui/form/Field.module.css";

/**
 * Error state of a pre-bound field and the ids of its messages. TanStack Form owns validity: Base UI only receives
 * `invalid`, never a `validate` or a native constraint (`required`, `pattern`).
 *
 * `describedBy` goes on the control: Base UI appends the ids of `Field.Description` and `Field.Error` in mount order
 * (help first), and puts the ids it receives in front, without duplicates. The control is thus described by the
 * error, then the help (04 § 5.4).
 */
export function useFieldMessages(field: AnyFieldApi) {
  const id = useId();
  const { isValid, errors } = field.state.meta;
  const errorId = `${id}-error`;
  return {
    invalid: !isValid,
    error: errorText(errors),
    errorId,
    helpId: `${id}-help`,
    describedBy: isValid ? undefined : errorId,
  };
}

type FieldMessages = ReturnType<typeof useFieldMessages>;

/**
 * Red round « ! » before an error message (08 § 4.6). It stays outside the element that `aria-describedby` reads: the
 * error text is the message of the spec alone.
 */
export function ErrorMark() {
  return (
    <span className={styles["mark"]} aria-hidden="true">
      !
    </span>
  );
}

interface FieldShellProps {
  field: AnyFieldApi;
  messages: FieldMessages;
  /** Help under the field (`.field-help`), hidden while the field shows an error (04 § 5.4). */
  description?: ReactNode;
  disabled?: boolean | undefined;
  /** False when another element shows the error of the field (`errorShownBy` of `NumberField`). */
  errorHere?: boolean;
  /** Label and control. */
  children: ReactNode;
}

/** `Field.Root` of a pre-bound field around its label and control, then its error and help. */
export function FieldShell({
  field,
  messages,
  description,
  disabled = false,
  errorHere = true,
  children,
}: FieldShellProps) {
  return (
    <Field.Root
      name={field.name}
      invalid={messages.invalid}
      touched={field.state.meta.isTouched}
      dirty={field.state.meta.isDirty}
      disabled={disabled}
      className={styles["field"]}
    >
      {children}
      {messages.invalid && errorHere ? (
        <div className={styles["error"]}>
          <ErrorMark />
          <Field.Error match id={messages.errorId}>
            {messages.error}
          </Field.Error>
        </div>
      ) : null}
      {description === undefined ? null : (
        <Field.Description id={messages.helpId} className={styles["help"]}>
          {description}
        </Field.Description>
      )}
    </Field.Root>
  );
}
