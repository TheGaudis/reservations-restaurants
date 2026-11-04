import type { AnyFormApi } from "@tanstack/react-form";
import type { ComponentType, PropsWithChildren, ReactNode } from "react";

import { focusFirstInvalid } from "@/ui/form/errors";

/** What `Form` needs of a form made by `useAppForm`. */
interface SubmittableForm {
  AppForm: ComponentType<PropsWithChildren>;
  handleSubmit: AnyFormApi["handleSubmit"];
  state: Pick<AnyFormApi["state"], "isSubmitting">;
}

interface FormProps {
  form: SubmittableForm;
  children: ReactNode;
  className?: string | undefined;
  /** Name of the form for assistive technologies, when no visible title names it. */
  "aria-label"?: string | undefined;
}

/**
 * `<form noValidate>` of a form made by `useAppForm`: Enter in a field submits (E-03), the browser checks nothing,
 * `form.SubmitButton` reads the form from context. After a refused submit, the first invalid control in DOM order
 * gets the focus (04 § 5.4); the same holds for a refusal of the script set by `onSubmit` (`setServerErrors`).
 * A second submit during a send is ignored (Enter in a field while the button is busy).
 */
export function Form({ form, children, className, "aria-label": ariaLabel }: FormProps) {
  async function submit(element: HTMLFormElement) {
    if (form.state.isSubmitting) return;
    // `onSubmit` catches its own errors (R-17): `handleSubmit` rethrows them.
    await form.handleSubmit();
    focusFirstInvalid(element);
  }
  return (
    <form.AppForm>
      <form
        noValidate
        className={className}
        aria-label={ariaLabel}
        onSubmit={(event) => {
          event.preventDefault();
          void submit(event.currentTarget);
        }}
      >
        {children}
      </form>
    </form.AppForm>
  );
}
