import type { AnyFormApi } from "@tanstack/react-form";

/**
 * Message to show under a field. A validator written as a function returns a string; a Standard Schema validator
 * (valibot) returns issue objects `{ message }` (R-17).
 */
export function errorText(errors: readonly unknown[]): string {
  for (const error of errors) {
    if (typeof error === "string" && error !== "") return error;
    if (typeof error === "object" && error !== null && "message" in error) {
      const { message } = error;
      if (typeof message === "string" && message !== "") return message;
    }
  }
  return "";
}

// A container in error without a control (a group, a total) is skipped (04 § 5.4).
const FOCUSABLE_INVALID =
  '[aria-invalid="true"]:is(input, select, textarea, button, [tabindex]):not(:disabled)';

/** Focuses the first invalid control of `root` in DOM order, not in the order of the rules (04 § 5.4). */
export function focusFirstInvalid(root: ParentNode) {
  root.querySelector<HTMLElement>(FOCUSABLE_INVALID)?.focus();
}

/**
 * Shows refusals of the script under their fields (a-5), from `onSubmit` after `mutateAsync` failed:
 * `setServerErrors(formApi, { students: error.message })`. Keys are field names (`"items[2].quantity"`); the next
 * change that leaves the form valid clears them.
 */
export function setServerErrors(
  form: Pick<AnyFormApi, "setErrorMap">,
  fields: Record<string, string>,
) {
  form.setErrorMap({ onServer: { fields } });
}
