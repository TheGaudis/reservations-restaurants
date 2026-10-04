import type { ReactNode } from "react";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";

import type { IsoDate, Restaurant } from "@/domain/types";
import { commonMessages } from "@/intl/common-messages";
import { formatLongDate } from "@/intl/dates";

import styles from "@/features/calendar/DayCard.module.css";

const messages = defineMessages({
  theme: {
    id: "public.dayCard.theme",
    defaultMessage: "Thème du jour",
    description: "05 § 4.4, 04 § 4.2-4.3 — surtitre du bloc thème des fiches R1 et R2",
  },
});

interface DayDetailProps {
  restaurant: Restaurant;
  /** The booking summary, if any, then the day card (05 § 5.1, § 6.2). */
  children: ReactNode;
}

/**
 * Space under a calendar (`#detail-rX`, 05 § 1): its view-transition-name lets the card slide when a day is chosen
 * with the mouse (05 § 3.4, view-transitions.css). `data-day-detail` lets `focusCardDate` find the card of the
 * restaurant.
 */
export function DayDetail({ restaurant, children }: DayDetailProps) {
  return (
    <div
      className={styles["detail"]}
      data-day-detail={restaurant}
      style={{ viewTransitionName: `${restaurant}-day-card` }}
    >
      {children}
    </div>
  );
}

interface DayCardProps {
  iso: IsoDate;
  /** Before today in Paris: the card pales without losing contrast (`.is-past`, 05 § 4.2, E-56); buttons keep their colours. */
  past: boolean;
  /** On the right of the date: the seat gauge of R1 (05 § 5.1). */
  gauge?: ReactNode;
  /** Text blocks, dishes, notes and actions, in the order of 05 § 5.1 and § 6.2. */
  children?: ReactNode;
}

/**
 * Card of the selected day (`.day-card`, 05 § 4): the long date with « 1er » (E-21), then its content. The date takes
 * the focus by script after a deletion in the staff mode (`focusCardDate`, 03 § 5.4, E-48): `tabIndex` -1, out of the
 * tab order.
 */
export function DayCard({ iso, past, gauge, children }: DayCardProps) {
  return (
    <div className={styles["card"]} data-past={past || undefined}>
      <div className={styles["top"]}>
        <p className={styles["date"]} tabIndex={-1} data-day-date="">
          {formatLongDate(iso)}
        </p>
        {gauge}
      </div>
      {children}
    </div>
  );
}

/** Card of a day that no colleague opened (05 § 4.3, P-03, P-10). */
export function NoServiceCard({ iso, past }: Pick<DayCardProps, "iso" | "past">) {
  return (
    <DayCard iso={iso} past={past}>
      <p className={styles["empty"]}>
        <FormattedMessage {...commonMessages.noService} />
      </p>
    </DayCard>
  );
}

interface TextBlockProps {
  /** Small capitals above the text: « Thème du jour », « Menu du jour », « Note » (05 § 4.4). */
  label: ReactNode;
  /** Typed by a colleague, shown as is. */
  text: string;
}

/** `menuBlockHtml` (05 § 4.4): a kicker over a text, under a thin rule. Nothing when the text is empty. */
export function TextBlock({ label, text }: TextBlockProps) {
  if (text === "") return null;
  return (
    <div className={styles["block"]}>
      <span className="kicker">{label}</span>
      <div className={styles["text"]}>{text}</div>
    </div>
  );
}

/** « Thème du jour » of an R1 or R2 day (05 § 5.1, § 6.2). */
export function ThemeBlock({ text }: { text: string }) {
  const intl = useIntl();
  return <TextBlock label={intl.formatMessage(messages.theme)} text={text} />;
}

/** Row of buttons at the bottom of a card (`.day-actions`, 05 § 5.1). */
export function DayActions({ children }: { children: ReactNode }) {
  return <div className={styles["actions"]}>{children}</div>;
}

/** Why « Réserver » is missing (D-02, E-27): « Complet. », « Tous les plats sont épuisés. » */
export function DayNote({ children }: { children: ReactNode }) {
  return <p className={styles["note"]}>{children}</p>;
}
