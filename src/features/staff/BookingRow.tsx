import { Fragment } from "react";
import type { ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import type { BookingLine } from "@/features/staff/booking-line";
import { staffCommonMessages } from "@/intl/staff-messages";
import { Button } from "@/ui/button/Button";
import { ConfirmButton } from "@/ui/button/ConfirmButton";

import styles from "@/features/staff/BookingList.module.css";

/** « **Nom** — Classe — 3 couverts — 16,00 € — contact — *observation* » (05 § 4.6). */
function LineText({ line }: { line: BookingLine }) {
  const parts: Array<{ key: string; node: ReactNode }> = [];
  if (line.name !== "") {
    parts.push({ key: "name", node: <b className={styles["name"]}>{line.name}</b> });
  }
  for (const [index, detail] of line.details.entries()) {
    parts.push({ key: `detail-${String(index)}`, node: detail });
  }
  if (line.observation !== "") parts.push({ key: "observation", node: <i>{line.observation}</i> });
  return (
    <span className={styles["line"]}>
      {parts.map((part, index) => (
        <Fragment key={part.key}>
          {index > 0 ? (
            <FormattedMessage
              id="staff.booking.line.separator"
              defaultMessage=" — "
              description="05 § 4.6 — séparateur des parties d'une ligne de réservation, espaces normales (join(' — '))"
            />
          ) : null}
          {part.node}
        </Fragment>
      ))}
    </span>
  );
}

interface BookingRowProps {
  line: BookingLine;
  /** Id of « Modifier »: the edit form gives it the focus back when it closes (E-48). */
  editButtonId: string;
  /** The edit form of this booking is open under the row. */
  expanded: boolean;
  onEdit: () => void;
  /** The deletion of this booking is on its way: « Confirmer ? » stays, busy (E-04). */
  deleting: boolean;
  /** Second click on « Supprimer » (06 § 5.2). */
  onDelete: () => void;
}

/** One booking of a staff card (05 § 4.6, 06 § 7.1): its line, « Modifier » (`aria-expanded`), « Supprimer » (two clicks). */
export function BookingRow({
  line,
  editButtonId,
  expanded,
  onEdit,
  deleting,
  onDelete,
}: BookingRowProps) {
  const intl = useIntl();
  return (
    <div className={styles["row"]}>
      <LineText line={line} />
      <span className={styles["actions"]}>
        <Button id={editButtonId} size="small" aria-expanded={expanded} onClick={onEdit}>
          <FormattedMessage {...staffCommonMessages.edit} />
        </Button>
        <ConfirmButton
          size="small"
          detail={intl.formatMessage(staffCommonMessages.bookingDeleteDetail)}
          busy={deleting}
          onConfirm={onDelete}
        >
          <FormattedMessage {...staffCommonMessages.delete} />
        </ConfirmButton>
      </span>
    </div>
  );
}
