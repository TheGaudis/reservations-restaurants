import { useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";

import { CONFIRM_WINDOW_MS } from "@/domain/constants";
import { Button } from "@/ui/button/Button";
import type { ButtonSize } from "@/ui/button/Button";

import styles from "@/ui/button/ConfirmButton.module.css";

const messages = defineMessages({
  label: {
    id: "ui.confirm.label",
    defaultMessage: "Confirmer ?",
    description: "00 § 2.1, 06 § 5.2 — libellé d'un bouton de suppression armé",
  },
});

export interface ConfirmButtonProps {
  /** Label at rest: « Supprimer ce jour », « Supprimer »… */
  children: ReactNode;
  /** `aria-label` and `title` while armed (06 § 5.2, D-21), already formatted by `intl`. */
  detail: string;
  /** Second click within 4 s. */
  onConfirm: () => void;
  /** Shows `detail` next to the armed button: deletion of a day or a dish that has bookings (D-21, E-38). */
  showDetail?: boolean | undefined;
  /** Deletion sent: the button stays « Confirmer ? », busy (E-04); back to rest when the parent clears it. */
  busy?: boolean | undefined;
  disabled?: boolean | undefined;
  size?: ButtonSize | undefined;
}

/**
 * Two-click deletion (06 § 5.2, `confirmClick` of 00 § 3). First click: armed, « Confirmer ? », width frozen, detail
 * in `aria-label` and `title`, hidden announcement. Second click within 4 s: `onConfirm`. Otherwise back to rest. Each
 * click cancels the previous timer, so a fast new arming gets its full 4 s (a-19).
 */
export function ConfirmButton({
  children,
  detail,
  onConfirm,
  showDetail = false,
  busy = false,
  disabled = false,
  size = "default",
}: ConfirmButtonProps) {
  const intl = useIntl();
  const [armed, setArmed] = useState(false);
  const [frozenWidth, setFrozenWidth] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function disarm() {
    setArmed(false);
    setFrozenWidth(null);
  }

  function handleClick(event: MouseEvent<HTMLElement>) {
    clearTimeout(timer.current);
    if (armed) {
      setArmed(false);
      onConfirm();
      return;
    }
    setFrozenWidth(event.currentTarget.getBoundingClientRect().width);
    setArmed(true);
    timer.current = setTimeout(disarm, CONFIRM_WINDOW_MS);
  }

  const confirming = armed || busy;
  const label = intl.formatMessage(messages.label);
  return (
    <>
      <Button
        variant="danger"
        size={size}
        busy={busy}
        busyLabel={label}
        disabled={disabled}
        data-armed={confirming || undefined}
        aria-label={confirming ? detail : undefined}
        title={confirming ? detail : undefined}
        style={frozenWidth === null ? undefined : { minWidth: frozenWidth }}
        onClick={handleClick}
      >
        {armed ? label : children}
      </Button>
      {showDetail && confirming ? (
        <span className={styles["note"]} aria-hidden="true">
          {detail}
        </span>
      ) : null}
      <output className="visually-hidden">
        {armed ? (
          <FormattedMessage
            id="ui.confirm.armedAnnouncement"
            defaultMessage="Cliquez de nouveau pour confirmer."
            description="PLAN annexe F, a-19 — annonce masquée quand un bouton de suppression s'arme"
          />
        ) : null}
      </output>
    </>
  );
}
