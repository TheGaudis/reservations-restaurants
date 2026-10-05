import { createFormHookContexts } from "@tanstack/react-form";

/**
 * Contexts that bind the fields of `app-form.ts` to the form around them: a field reads its TanStack field with
 * `useFieldContext<T>()`, a form component (`SubmitButton`) reads the form with `useFormContext()`.
 */
export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();
