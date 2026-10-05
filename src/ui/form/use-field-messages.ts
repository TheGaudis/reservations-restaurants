import type { AnyFieldApi } from "@tanstack/react-form";
import { useId } from "react";

import { errorText } from "@/ui/form/errors";

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

export type FieldMessagesState = ReturnType<typeof useFieldMessages>;
