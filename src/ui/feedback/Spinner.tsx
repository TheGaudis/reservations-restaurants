import { defineMessages, useIntl } from "react-intl";

import styles from "@/ui/feedback/Spinner.module.css";

const messages = defineMessages({
  label: {
    id: "ui.spinner.label",
    defaultMessage: "Chargement en cours",
    description: "08 § 4.15 — nom accessible de l'indicateur de chargement",
  },
});

/**
 * Indeterminate loading indicator (08 § 4.15): a native `<progress>` for assistive technologies, the Material 3
 * circle on screen.
 */
export function Spinner() {
  const intl = useIntl();
  return (
    <span className={styles["spinner"]}>
      <progress className="visually-hidden" aria-label={intl.formatMessage(messages.label)} />
      <svg viewBox="0 0 50 50" aria-hidden="true">
        <circle cx="25" cy="25" r="20" />
      </svg>
    </span>
  );
}
