import { defineMessage, FormattedMessage, useIntl } from "react-intl";

import type { SummaryR1, SummaryR2, SummaryWarning } from "@/domain/bookings";
import type { Restaurant } from "@/domain/types";
import { columnFocus, useBookingColumns } from "@/features/booking/booking-columns";
import type { BookingSummaryContent } from "@/features/booking/booking-columns";
import { useSelectedDay } from "@/features/calendar/page-search";
import { summaryR1TotalText, summaryR2TotalText } from "@/intl/amounts";
import {
  studentsLabel,
  staffMembersLabel,
  externalsLabel,
  takeawayLabel,
  dineInLabel,
} from "@/intl/common-messages";
import { formatLongDate } from "@/intl/dates";
import { useAppState } from "@/queries/use-app-state";
import type { AppState } from "@/queries/use-app-state";
import { Button } from "@/ui/button/Button";
import { Note } from "@/ui/feedback/Alert";
import { SummaryCheckIcon } from "@/ui/icons";
import { focusOnMount } from "@/ui/pending-focus";

import styles from "@/features/booking/BookingSummary.module.css";

const titleMessage = defineMessage({
  id: "public.summary.title",
  defaultMessage: "Réservation enregistrée",
  description: "04 § 7, § 9 — titre du récapitulatif après une réservation",
});

const duplicateTitle = defineMessage({
  id: "public.summary.duplicateTitle",
  defaultMessage: "Réservation déjà enregistrée",
  description: "PLAN annexe F, D-16 — titre du récapitulatif d'un doublon",
});

const duplicateWarningMessage = defineMessage({
  id: "public.summary.duplicateWarning",
  defaultMessage:
    "Cette réservation était déjà enregistrée : elle n'a pas été ajoutée une seconde fois.",
  description: "PLAN annexe F, D-16 — avertissement du récapitulatif d'un doublon",
});

const adjustedMessage = defineMessage({
  id: "public.summary.warning.adjusted",
  defaultMessage:
    "Certaines quantités ont été ajustées faute de stock. Vérifiez votre email pour le détail.",
  description: "04 § 7, § 9 — avertissement du récapitulatif R2 : plat ajusté ou écarté",
});

const emailFailedMessage = defineMessage({
  id: "public.summary.warning.emailFailed",
  defaultMessage: "L'email de confirmation n'a pas pu être envoyé. Gardez ce récapitulatif.",
  description: "04 § 7, § 9 — avertissement du récapitulatif : e-mail de confirmation non parti",
});

const nameMessage = defineMessage({
  id: "public.summary.name",
  defaultMessage: "Nom",
  description: "04 § 7 — libellé de la ligne du nom du récapitulatif",
});

const classNameMessage = defineMessage({
  id: "public.summary.className",
  defaultMessage: "Classe / service",
  description: "04 § 7 — libellé de la ligne de la classe du récapitulatif",
});

const modeMessage = defineMessage({
  id: "public.summary.mode",
  defaultMessage: "Mode",
  description: "04 § 7 — libellé de la ligne du mode de service du récapitulatif R2",
});

const dishFallbackMessage = defineMessage({
  id: "public.summary.dishFallback",
  defaultMessage: "Plat",
  description: "04 § 7 — libellé d'une ligne de plat sans nom du récapitulatif R2",
});

const portionsMessage = defineMessage<{ portions: string }>({
  id: "public.summary.portions",
  defaultMessage: "× {portions}",
  description: "04 § 7 — portions accordées d'un plat du récapitulatif R2 (« × 2 », signe U+00D7)",
});

const defaultContactMessage = defineMessage({
  id: "public.summary.defaultContact",
  defaultMessage: "l'établissement",
  description: "04 § 7 — contact de la note du récapitulatif quand le paramètre est vide",
});

interface Line {
  label: string;
  value: string;
}

type Intl = ReturnType<typeof useIntl>;

/** Lines of 04 § 7: name, class, then each counter above 0. */
function linesR1(intl: Intl, summary: SummaryR1): Line[] {
  const lines: Line[] = [
    { label: intl.formatMessage(nameMessage), value: summary.name },
    { label: intl.formatMessage(classNameMessage), value: summary.className },
  ];
  const counters = [
    [studentsLabel, summary.counts.students],
    [staffMembersLabel, summary.counts.staffMembers],
    [externalsLabel, summary.counts.externals],
  ] as const;
  for (const [label, count] of counters) {
    if (count > 0) lines.push({ label: intl.formatMessage(label), value: String(count) });
  }
  return lines;
}

/** Lines of 04 § 7: name, class, mode sent, then each dish granted (« Plat » for a dish without a name). */
function linesR2(intl: Intl, summary: SummaryR2): Line[] {
  const mode = summary.serviceMode === "takeaway" ? takeawayLabel : dineInLabel;
  return [
    { label: intl.formatMessage(nameMessage), value: summary.name },
    { label: intl.formatMessage(classNameMessage), value: summary.className },
    { label: intl.formatMessage(modeMessage), value: intl.formatMessage(mode) },
    ...summary.dishes.map((dish) => ({
      label: dish.name === "" ? intl.formatMessage(dishFallbackMessage) : dish.name,
      value: intl.formatMessage(portionsMessage, { portions: String(dish.portions) }),
    })),
  ];
}

function warningTexts(intl: Intl, summary: BookingSummaryContent): string[] {
  const texts = summary.duplicate ? [intl.formatMessage(duplicateWarningMessage)] : [];
  const warningText = (warning: SummaryWarning) =>
    intl.formatMessage(warning === "adjusted" ? adjustedMessage : emailFailedMessage);
  return [...texts, ...summary.warnings.map(warningText)];
}

const cancellationContactOf = (state: AppState) => state.settings.cancellationContact;

/** The title of a summary just shown takes the focus, scrolled into view (E-12). */
const focusTitle = (title: HTMLElement) => {
  title.focus();
};

interface BookingSummaryProps {
  summary: BookingSummaryContent;
  /** « Fermer ». */
  onClose: () => void;
}

/**
 * Summary of a booking (04 § 7, 08 § 6.1, P-06, P-14), an `<output>` (role `status`): title, long date, warnings (both when both
 * apply, E-14; « déjà enregistrée » for a duplicate, D-16), lines, total, cancellation contact, « Fermer ».
 * The page shows it through `ColumnSummary`.
 */
export function BookingSummary({ summary, onClose }: BookingSummaryProps) {
  const intl = useIntl();
  const contact = useAppState(cancellationContactOf);
  const lines = summary.restaurant === "r1" ? linesR1(intl, summary) : linesR2(intl, summary);
  const total =
    summary.restaurant === "r1"
      ? summaryR1TotalText(summary.seats, summary.price)
      : summaryR2TotalText(summary.amounts);
  const warnings = warningTexts(intl, summary);
  return (
    <output className={styles["card"]} data-warning={warnings.length > 0 || undefined}>
      <div className={styles["head"]}>
        <span className={styles["check"]} aria-hidden="true">
          <SummaryCheckIcon />
        </span>
        <div>
          <p
            className={styles["title"]}
            tabIndex={-1}
            ref={focusOnMount(columnFocus.summary(summary.restaurant), focusTitle)}
          >
            <FormattedMessage {...(summary.duplicate ? duplicateTitle : titleMessage)} />
          </p>
          <p className={styles["date"]}>{formatLongDate(summary.date)}</p>
        </div>
      </div>
      {warnings.map((text) => (
        <div key={text} className={styles["warning"]}>
          <Note tone="warning">{text}</Note>
        </div>
      ))}
      <ul className={styles["lines"]}>
        {lines.map((line) => (
          <li key={`${line.label}:${line.value}`}>
            <span>{line.label}</span>
            <b>{line.value}</b>
          </li>
        ))}
      </ul>
      {total === "" ? null : (
        <div className={styles["total"]}>
          <span>
            <FormattedMessage
              id="public.summary.total"
              defaultMessage="Total"
              description="04 § 7, § 9 — libellé du total du récapitulatif"
            />
          </span>
          <b>{total}</b>
        </div>
      )}
      <p className={styles["note"]}>
        <FormattedMessage
          id="public.summary.contact"
          defaultMessage="Pour annuler ou modifier, contactez {contact}."
          description="04 § 7, § 9 — note du récapitulatif (contact d'annulation des paramètres)"
          values={{
            contact: contact === "" ? intl.formatMessage(defaultContactMessage) : contact,
          }}
        />
      </p>
      <Button size="small" onClick={onClose}>
        <FormattedMessage
          id="common.action.close"
          defaultMessage="Fermer"
          description="00 § 2.3, 04 § 7 — bouton du récapitulatif"
        />
      </Button>
    </output>
  );
}

/**
 * Summary of a column (D-11), above its day card while the day of the booking stays selected (04 § 7); a day
 * chosen in the calendar or « Réserver » removes it (`useBookingColumns().clear`).
 */
export function ColumnSummary({ restaurant }: { restaurant: Restaurant }) {
  const columns = useBookingColumns();
  const selected = useSelectedDay(restaurant);
  const summary = columns.summaries[restaurant];
  if (summary === null || summary.date !== selected) return null;
  return (
    <BookingSummary
      summary={summary}
      onClose={() => {
        columns.clear(restaurant);
      }}
    />
  );
}
