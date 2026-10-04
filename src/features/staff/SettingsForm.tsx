import { defineMessages, FormattedMessage } from "react-intl";

import { changedSettings, settingErrors, settingsValues, SETTING_KEYS } from "@/domain/settings";
import type { SettingError, SettingsValues } from "@/domain/settings";
import type { FullState, SettingKey } from "@/domain/types";
import { SlowWriteNotice } from "@/features/booking/SlowWriteNotice";
import { useSlowWrite } from "@/features/booking/use-slow-write";
import { useStaffState } from "@/features/staff/use-staff-state";
import { commonMessages } from "@/intl/common-messages";
import { intl } from "@/intl/intl";
import { SettingsPartialFailureError, useSaveSettings } from "@/mutations/staff/settings";
import { staffErrorText } from "@/mutations/staff/write";
import { showToast } from "@/ui/feedback/toast";
import { useAppForm } from "@/ui/form/app-form";
import { Form } from "@/ui/form/Form";
import type { InputProps } from "@/ui/form/TextField";

import styles from "@/features/staff/SettingsForm.module.css";

// Fields of « Paramètres » (06 § 2.2) and their sending (D-20): rules in domain/settings.ts, requests in
// mutations/staff/settings.ts.

const labels = defineMessages<SettingKey>({
  name1: {
    id: "staff.settings.field.name1",
    defaultMessage: "Nom du restaurant 1",
    description: "06 § 2.2 — libellé du champ du nom du restaurant 1",
  },
  name2: {
    id: "staff.settings.field.name2",
    defaultMessage: "Nom du restaurant 2",
    description: "06 § 2.2 — libellé du champ du nom du restaurant 2",
  },
  desc1: {
    id: "staff.settings.field.desc1",
    defaultMessage: "Description du restaurant 1",
    description: "06 § 2.2 — libellé du champ de la description du restaurant 1",
  },
  desc2: {
    id: "staff.settings.field.desc2",
    defaultMessage: "Description du restaurant 2",
    description: "06 § 2.2 — libellé du champ de la description du restaurant 2",
  },
  cancellationContact: {
    id: "staff.settings.field.cancellationContact",
    defaultMessage: "Contact à indiquer pour une annulation (affiché dans les emails)",
    description: "06 § 2.2 — libellé du champ du contact d'annulation",
  },
  priceStudent: {
    id: "staff.settings.field.priceStudent",
    defaultMessage: "Tarif élève (€)",
    description: "06 § 2.2 — libellé du champ du tarif élève",
  },
  priceStaff: {
    id: "staff.settings.field.priceStaff",
    defaultMessage: "Tarif professeur/personnel (€)",
    description: "06 § 2.2 — libellé du champ du tarif professeur ou personnel",
  },
  priceExternal: {
    id: "staff.settings.field.priceExternal",
    defaultMessage: "Tarif extérieur (€)",
    description: "06 § 2.2 — libellé du champ du tarif extérieur",
  },
});

const messages = defineMessages<{
  contactPlaceholder: Record<string, never>;
  noChange: Record<string, never>;
  partialFailure: { saved: string; failed: string; message: string };
}>({
  contactPlaceholder: {
    id: "staff.settings.field.cancellationContact.placeholder",
    defaultMessage: "Ex. le secrétariat au 03 00 00 00 00",
    description: "06 § 2.2 — exemple dans le champ du contact d'annulation",
  },
  noChange: {
    id: "staff.settings.noChange",
    defaultMessage: "Aucune modification à enregistrer.",
    description: "06 § 2.2 (2) — toast quand aucun champ ne diffère des paramètres enregistrés",
  },
  partialFailure: {
    id: "staff.settings.partialFailure",
    defaultMessage: "Enregistré : {saved}. Non enregistré : {failed} ({message}).",
    description:
      "PLAN annexe F, D-20 — toast d'un échec partiel ; saved et failed : libellés des champs joints par « , »",
  },
});

const errorMessages = defineMessages<SettingError>({
  nameRequired: {
    id: "staff.settings.error.nameRequired",
    defaultMessage: "Indiquez le nom du restaurant.",
    description: "PLAN annexe F, D-20 — nom d'un restaurant vidé",
  },
  invalidPrice: {
    id: "staff.settings.error.invalidPrice",
    defaultMessage: "Indiquez un tarif positif ou nul (ex. 4,95).",
    description: "PLAN annexe F, D-20 — tarif vide, négatif ou qui n'est pas un nombre",
  },
});

/** Fields over both columns of the grid (06 § 2.2: « pleine »). */
const WIDE_FIELDS: ReadonlySet<SettingKey> = new Set(["desc1", "desc2", "cancellationContact"]);

/** Attributes of an input (06 § 2.2): the prices are number inputs, step 0.01, min 0. */
function inputProps(key: SettingKey): InputProps {
  if (key === "priceStudent" || key === "priceStaff" || key === "priceExternal") {
    return { type: "number", step: "0.01", min: "0", inputMode: "decimal", autoComplete: "off" };
  }
  if (key === "cancellationContact") {
    return { placeholder: intl.formatMessage(messages.contactPlaceholder), autoComplete: "off" };
  }
  return { autoComplete: "off" };
}

function settingsRules(values: SettingsValues) {
  const errors = settingErrors(values);
  const fields = Object.fromEntries(
    Object.entries(errors).map(([key, error]) => [key, intl.formatMessage(errorMessages[error])]),
  );
  return Object.keys(fields).length === 0 ? undefined : { fields };
}

function labelsOf(keys: readonly SettingKey[]): string {
  return keys.map((key) => intl.formatMessage(labels[key])).join(", ");
}

/**
 * Text of a failed save: what was saved and what was not, with the reason (D-20, E-37); otherwise the script's
 * message or the staff text of D-14. Null for a refused password: the logout says it.
 */
function failureText(error: unknown): string | null {
  if (!(error instanceof SettingsPartialFailureError)) return staffErrorText(error);
  const message = staffErrorText(error.cause);
  if (message === null) return null;
  return intl.formatMessage(messages.partialFailure, {
    saved: labelsOf(error.saved),
    failed: labelsOf(error.failed),
    message,
  });
}

function useSettingsForm() {
  const save = useSaveSettings();
  const slowWrite = useSlowWrite();
  const settings = useStaffState((state: FullState) => state.settings);
  const form = useAppForm({
    defaultValues: settingsValues(settings),
    validators: { onDynamic: ({ value }: { value: SettingsValues }) => settingsRules(value) },
    onSubmit: async ({ value, formApi }) => {
      const changes = changedSettings(value, settings);
      if (changes.length === 0) {
        showToast(intl.formatMessage(messages.noChange), "success");
        return;
      }
      slowWrite.start();
      try {
        // The panel stays open (06 § 2.2): the fields show what the script saved, a default text included.
        await save.mutateAsync(changes, {
          onSuccess: ({ state }) => {
            formApi.reset(settingsValues(state.settings));
          },
        });
      } catch (error) {
        const text = failureText(error);
        if (text !== null) showToast(text, "error");
      } finally {
        slowWrite.stop();
      }
    },
  });
  return { form, slowWrite };
}

/**
 * Form of « Paramètres » (06 § 2.2, C-02): names, descriptions, cancellation contact and the three prices of the full
 * state, on a grid of two columns. Only the changed fields go to the script, one request after the other.
 */
export function SettingsForm() {
  const { form, slowWrite } = useSettingsForm();
  return (
    <Form form={form}>
      <div className={styles["grid"]}>
        {SETTING_KEYS.map((key) => (
          <div key={key} className={WIDE_FIELDS.has(key) ? styles["wide"] : undefined}>
            <form.AppField name={key}>
              {(field) => (
                <field.TextField label={intl.formatMessage(labels[key])} {...inputProps(key)} />
              )}
            </form.AppField>
          </div>
        ))}
      </div>
      <form.SubmitButton pendingLabel={intl.formatMessage(commonMessages.saving)}>
        <FormattedMessage
          id="staff.settings.save"
          defaultMessage="Enregistrer les paramètres"
          description="06 § 2.2 — bouton d'envoi du panneau des paramètres"
        />
      </form.SubmitButton>
      <SlowWriteNotice slow={slowWrite.slow} />
    </Form>
  );
}
