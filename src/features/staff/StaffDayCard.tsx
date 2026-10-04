import { defineMessages, useIntl } from "react-intl";

import type { IsoDate } from "@/domain/types";
import { DayCard } from "@/features/calendar/DayCard";

import styles from "@/features/staff/StaffDayCard.module.css";

const messages = defineMessages<{
  noService: Record<string, never>;
  openedBy: { name: string };
}>({
  noService: {
    id: "staff.dayCard.noService",
    defaultMessage:
      "Aucun jour ouvert. Utilisez le formulaire « Ouvrir un jour » pour en créer un à cette date.",
    description: "05 § 4.3 — fiche collègue d'un jour sans service (C-10b, R1 et R2)",
  },
  openedBy: {
    id: "staff.dayCard.openedBy",
    defaultMessage: "Ouvert par {name}",
    description:
      "05 § 5.1 (4), § 6.2 (4) — collègue qui a ouvert le jour, fiches collègue R1 et R2",
  },
});

/** Staff card of a day that no colleague opened (05 § 4.3, C-10b): « Ouvrir un jour » above the calendar creates it. */
export function StaffNoServiceCard({ iso, past }: { iso: IsoDate; past: boolean }) {
  const intl = useIntl();
  return (
    <DayCard iso={iso} past={past}>
      <p className={styles["empty"]}>{intl.formatMessage(messages.noService)}</p>
    </DayCard>
  );
}

/** « Ouvert par {name} » under the texts of a staff card; nothing when nobody signed (05 § 5.1 (4), § 6.2 (4)). */
export function OpenedBy({ name }: { name: string }) {
  const intl = useIntl();
  if (name === "") return null;
  return <p className={styles["meta"]}>{intl.formatMessage(messages.openedBy, { name })}</p>;
}
