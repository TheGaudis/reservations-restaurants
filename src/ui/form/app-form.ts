import { createFormHook, revalidateLogic } from "@tanstack/react-form";

import { CheckboxField } from "@/ui/form/CheckboxField";
import { fieldContext, formContext } from "@/ui/form/form-context";
import { NumberField } from "@/ui/form/NumberField";
import { PasswordField } from "@/ui/form/PasswordField";
import { PriceField } from "@/ui/form/PriceField";
import { SubmitButton } from "@/ui/form/SubmitButton";
import { TextField } from "@/ui/form/TextField";

/**
 * The forms of the app (PLAN § 3.5). A form is made with `useAppForm` and drawn inside `Form` (`ui/form/Form.tsx`):
 *
 *   const form = useAppForm({ defaultValues, validators: { onDynamic: rules }, onSubmit });
 *   <Form form={form}>
 *     <form.AppField name="name">{(f) => <f.TextField label={…} />}</form.AppField>
 *     <form.SubmitButton>{…}</form.SubmitButton>
 *   </Form>
 *
 * Rules: one `onDynamic` validator for the whole form, returning `{ fields: { name: "message" } }`, so a submit
 * shows every error at once, cross-field rules included (R-17). Nothing is checked before the first submit; after it,
 * each change checks again and a message stays until the value is valid (E-46). A submit with errors still runs the
 * validators (`canSubmitWhenInvalid`), so the untouched fields get their message too. `onSubmit` awaits the mutation
 * inside `try/catch` (`handleSubmit` rethrows) and reports a refusal of the script under its field with
 * `setServerErrors` (`ui/form/errors.ts`), cleared by the next valid change. Until the user changes a field,
 * the form follows new `defaultValues` (data refreshed every 3 min); after that it keeps what was typed. A form that
 * must start again (another day, another opening) is mounted with a `key`.
 */
const { useAppForm: useBaseAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: { TextField, PasswordField, NumberField, PriceField, CheckboxField },
  formComponents: { SubmitButton },
});

const validationLogic = revalidateLogic({ mode: "submit", modeAfterSubmission: "change" });

/** `useForm` of TanStack Form with the app's fields and validation behaviour (see above). */
export const useAppForm: typeof useBaseAppForm = (options) =>
  useBaseAppForm({ validationLogic, canSubmitWhenInvalid: true, ...options });
