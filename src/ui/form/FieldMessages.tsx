import { Field } from "@base-ui/react/field";
import type { ReactNode } from "react";

import type { FieldMessagesState } from "@/ui/form/use-field-messages";

import styles from "@/ui/form/Field.module.css";

// Drawn in a red round before the message (08 § 4.6); hidden from assistive technologies, which read the message.
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
        <Field.Error match id={messages.errorId} className={styles["error"]}>
          <span className={styles["mark"]} aria-hidden="true">
            {MARK}
          </span>
          {messages.error}
        </Field.Error>
      ) : null}
      {description === undefined ? null : (
        <Field.Description id={messages.helpId} className={styles["help"]}>
          {description}
        </Field.Description>
      )}
    </>
  );
}
