import { Fieldset } from "@base-ui/react/fieldset";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import type { ReactNode } from "react";

import { FieldShell, useFieldMessages } from "@/ui/form/FieldShell";
import { useFieldContext } from "@/ui/form/form-context";
import { CheckIcon } from "@/ui/icons";

import fieldStyles from "@/ui/form/Field.module.css";
import styles from "@/ui/form/SegmentedRadio.module.css";

interface SegmentedRadioOption<T extends string> {
  value: T;
  label: ReactNode;
}

export interface SegmentedRadioProps<T extends string> {
  /** Name of the group (04 § 5.3: « Mode de service »). */
  legend: ReactNode;
  /** The public R2 form names the group for assistive technologies only (04 § 5.3). */
  hideLegend?: boolean | undefined;
  /** Help under the group (04 § 5.3: « Sur place uniquement ce jour-là… »). */
  description?: ReactNode;
  /** One option is allowed: a day with a meal voucher dish offers « Sur place » only (04 § 5.3, D-19). */
  options: ReadonlyArray<SegmentedRadioOption<T>>;
}

/**
 * Exclusive choice inside a form, drawn as Material 3 segmented buttons (08 § 4.5): a radio group, so the arrow
 * keys move the choice and Tab enters and leaves the group at once.
 */
export function SegmentedRadio<T extends string>({
  legend,
  hideLegend = false,
  description,
  options,
}: SegmentedRadioProps<T>) {
  const field = useFieldContext<T>();
  const fieldMessages = useFieldMessages(field);
  return (
    <FieldShell field={field} messages={fieldMessages} description={description}>
      <Fieldset.Root
        render={
          <RadioGroup
            value={field.state.value}
            onValueChange={(value) => {
              const option = options.find((candidate) => candidate.value === value);
              if (option !== undefined) field.handleChange(option.value);
            }}
            aria-describedby={fieldMessages.describedBy}
            className={styles["fieldset"]}
          />
        }
      >
        <Fieldset.Legend className={hideLegend ? "visually-hidden" : fieldStyles["label"]}>
          {legend}
        </Fieldset.Legend>
        <div className={styles["group"]}>
          {options.map((option) => (
            <Radio.Root
              key={option.value}
              value={option.value}
              onBlur={field.handleBlur}
              className={styles["segment"]}
            >
              <Radio.Indicator keepMounted className={styles["check"]}>
                <CheckIcon />
              </Radio.Indicator>
              <span>{option.label}</span>
            </Radio.Root>
          ))}
        </div>
      </Fieldset.Root>
    </FieldShell>
  );
}
