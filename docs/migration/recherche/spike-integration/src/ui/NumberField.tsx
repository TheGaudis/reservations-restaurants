import { NumberField as BaseNumberField } from "@base-ui/react/number-field";
import { useId } from "react";
import { useIntl } from "react-intl";

const MINUS = "\u2212";
const PLUS = "+";

interface NumberFieldProps {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}

export function NumberField({ label, value, max, onChange }: NumberFieldProps) {
  const intl = useIntl();
  const id = useId();
  return (
    <BaseNumberField.Root
      id={id}
      value={value}
      min={0}
      max={max}
      locale="fr-FR"
      onValueChange={(next) => {
        onChange(next ?? 0);
      }}
    >
      <label htmlFor={id}>{label}</label>
      <BaseNumberField.Group>
        <BaseNumberField.Decrement
          aria-label={intl.formatMessage({
            id: "ui.numberField.decrement",
            defaultMessage: "Diminuer",
            description: "bouton −",
          })}
        >
          <span aria-hidden="true">{MINUS}</span>
        </BaseNumberField.Decrement>
        <BaseNumberField.Input
          aria-roledescription={intl.formatMessage({
            id: "ui.numberField.role",
            defaultMessage: "champ numérique",
            description: "rôle du champ",
          })}
        />
        <BaseNumberField.Increment
          aria-label={intl.formatMessage({
            id: "ui.numberField.increment",
            defaultMessage: "Augmenter",
            description: "bouton +",
          })}
        >
          <span aria-hidden="true">{PLUS}</span>
        </BaseNumberField.Increment>
      </BaseNumberField.Group>
    </BaseNumberField.Root>
  );
}
