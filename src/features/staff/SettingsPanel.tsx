import { useNavigate, useSearch } from "@tanstack/react-router";
import { useId } from "react";
import { FormattedMessage } from "react-intl";

import { SettingsForm } from "@/features/staff/SettingsForm";
import { ExpandMoreIcon, SettingsIcon } from "@/ui/icons";

import styles from "@/features/staff/SettingsPanel.module.css";

// Panel « Paramètres » of `StaffPage`, open while `parametres=true` (06 § 2.2, D-20, C-02).

interface SettingsSearch {
  parametres?: boolean | undefined;
}

/**
 * Panel « Paramètres », under « Demain » and above the load error box (06 § 2): closed by default, open while the URL
 * says `parametres=true` (PLAN § 3.2, E-23). The title is a disclosure button that writes `parametres` (`replace`);
 * the logout leaves `/collegue`, so the panel is closed at the next login (E-24).
 */
export function SettingsPanel() {
  const bodyId = useId();
  const navigate = useNavigate();
  const search: SettingsSearch = useSearch({ strict: false });
  const open = search.parametres === true;
  return (
    <div className={styles["panel"]} data-open={open || undefined}>
      <button
        type="button"
        className={styles["trigger"]}
        aria-expanded={open}
        aria-controls={open ? bodyId : undefined}
        onClick={() => {
          void navigate({
            to: ".",
            search: (previous) => ({ ...previous, parametres: !open }),
            replace: true,
            resetScroll: false,
          });
        }}
      >
        <SettingsIcon className={styles["icon"]} />
        <span>
          <FormattedMessage
            id="staff.settings.title"
            defaultMessage="Paramètres"
            description="06 § 2.2 — titre du panneau dépliant des paramètres"
          />
        </span>
        <ExpandMoreIcon className={styles["chevron"]} />
      </button>
      {open ? (
        <div id={bodyId} className={styles["body"]}>
          <SettingsForm />
        </div>
      ) : null}
    </div>
  );
}
