import { useForm, revalidateLogic } from "@tanstack/react-form";
import { FormattedMessage, useIntl } from "react-intl";
import * as v from "valibot";

import { NumberField } from "@/ui/NumberField";

interface BookingFormProps {
  remaining: number;
}

export function BookingForm({ remaining }: BookingFormProps) {
  const intl = useIntl();
  const form = useForm({
    defaultValues: { name: "", seats: 1 },
    validationLogic: revalidateLogic({ mode: "submit", modeAfterSubmission: "change" }),
    validators: {
      onDynamic: v.object({
        name: v.pipe(v.string(), v.trim(), v.nonEmpty("Indiquez votre nom.")),
        seats: v.pipe(v.number(), v.minValue(1), v.maxValue(remaining)),
      }),
    },
    canSubmitWhenInvalid: true,
    onSubmit: () => {
      /* spike: no mutation */
    },
  });
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field name="name">
        {(field) => (
          <p>
            <label htmlFor={field.name}>
              <FormattedMessage
                id="public.r1.form.name.label"
                defaultMessage="Nom"
                description="04 § 5 — libellé du nom"
              />
            </label>
            <input
              id={field.name}
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onChange={(e) => {
                field.handleChange(e.target.value);
              }}
            />
            {field.state.meta.errors.length > 0 ? (
              <span role="alert">{field.state.meta.errors.map((e) => e?.message).join(", ")}</span>
            ) : null}
          </p>
        )}
      </form.Field>
      <form.Field name="seats">
        {(field) => (
          <NumberField
            label={intl.formatMessage({
              id: "public.r1.form.seats.label",
              defaultMessage: "Couverts",
              description: "04 § 5 — nombre de couverts",
            })}
            value={field.state.value}
            max={remaining}
            onChange={field.handleChange}
          />
        )}
      </form.Field>
      <button type="submit">
        <FormattedMessage
          id="common.action.book"
          defaultMessage="Réserver"
          description="bouton d'envoi"
        />
      </button>
    </form>
  );
}
