import { Field } from "@base-ui/react/field";
import type { ReactNode } from "react";

import type { FieldMessagesState } from "@/ui/form/use-field-messages";

import styles from "@/ui/form/Field.module.css";

// Red round before the message (08 § 4.6). It stays outside the error element: the error text, read through
// `aria-describedby` and by the tests, is the message of the spec alone.
const MARK = "!";

interface FieldMessagesProps {
  messages: FieldMessagesState;
  /** Help under the field (`.field-help`), hidden while the field shows an error (04 § 5.4). */
  description?: ReactNode;
}

/** Error and help of a pre-bound field, inside its `Field.Root`. */
export function FieldMessages({ messages, description }: FieldMessagesProps) {
  return (
    <>
      {messages.invalid ? (
        <div className={styles["error"]}>
          <span className={styles["mark"]} aria-hidden="true">
            {MARK}
          </span>
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
    </>
  );
}
