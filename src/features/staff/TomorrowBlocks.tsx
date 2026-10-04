import type { ReactNode } from "react";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";
import type { IntlShape } from "react-intl";

import { hasAmounts } from "@/domain/pricing";
import { listR1, listR2 } from "@/domain/print";
import type { DishTotal, ListR1, ListR2 } from "@/domain/print";
import type { FullState, IsoDate, Restaurant } from "@/domain/types";
import { printTomorrowR1, printTomorrowR2 } from "@/features/print/print-documents";
import { useStaffState } from "@/features/staff/use-staff-state";
import { amountsText, formatEuros, withPrice } from "@/intl/amounts";
import { IconButton } from "@/ui/button/IconButton";
import { PrintIcon } from "@/ui/icons";

import styles from "@/features/staff/TomorrowPanel.module.css";

// Blocks per restaurant of the panel « Demain ({date}) » (07 § 5, D-07), under its totals row, each with its
// « Imprimer » button (documents C and D, 07 § 6-7). Texts corrected by a-24 (PLAN annexe F, E-44); bookings of a
// deleted dish left out (b-3, E-30); one voucher per order (a-11, E-16).

// Value types of each message: react-intl types `formatMessage` from them.
const messages = defineMessages<{
  print: Record<string, never>;
  openedBy: { name: string };
  nobody: Record<string, never>;
  customer: { name: string; className: string };
  comma: { before: string; after: string };
  dishLine: { name: string; n: number };
  dishCustomers: { line: string; names: string };
  totalR2: { name: string; amounts: string };
  totalR2WithGap: { name: string; amounts: string };
}>({
  print: {
    id: "staff.tomorrow.print",
    defaultMessage: "Imprimer",
    description:
      "07 § 5 — aria-label et title du bouton icône qui imprime le résumé d'un restaurant",
  },
  openedBy: {
    id: "staff.tomorrow.openedBy",
    defaultMessage: "Ouvert par {name}",
    description: "07 § 5 — collègue qui a ouvert le jour de demain",
  },
  nobody: {
    id: "staff.tomorrow.openedBy.none",
    defaultMessage: "(aucun)",
    description: "07 § 5 — « Ouvert par » d'un jour ouvert sans nom",
  },
  customer: {
    id: "staff.tomorrow.r1.customer",
    defaultMessage: "{name} ({className})",
    description: "07 § 5 — une personne de la liste « Clients »",
  },
  comma: {
    id: "staff.tomorrow.comma",
    defaultMessage: "{before}, {after}",
    description: "07 § 5 — séparateur des noms des listes du résumé",
  },
  dishLine: {
    id: "print.tomorrow.r2.dishLine",
    defaultMessage: "• {name} : {n, plural, one {# portion} other {# portions}}",
    description: "PLAN annexe F, a-24 — résumé R2 du lendemain (remplace « {Nom}: … portion(s) »)",
  },
  dishCustomers: {
    id: "staff.tomorrow.r2.dishCustomers",
    defaultMessage: "{line} ({names})",
    description: "07 § 5 — ligne d'un plat suivie des noms des personnes qui l'ont réservé",
  },
  totalR2: {
    id: "staff.tomorrow.r2.total",
    defaultMessage: "Total {name} : {amounts}",
    description: "07 § 5 — montants de demain au restaurant 2 ; name : nom du restaurant 2",
  },
  totalR2WithGap: {
    id: "staff.tomorrow.r2.totalWithGap",
    defaultMessage: "Total {name} (hors plats sans prix indiqué) : {amounts}",
    description: "07 § 5, D-03 — montants de demain au restaurant 2 avec un plat sans prix",
  },
});

const whole = (state: FullState): FullState => state;

/** `parts` joined by « , » (07 § 5). */
function commaList(intl: IntlShape, parts: readonly string[]): string {
  const [first = "", ...rest] = parts;
  let text = first;
  for (const part of rest) text = intl.formatMessage(messages.comma, { before: text, after: part });
  return text;
}

function openedByText(intl: IntlShape, openedBy: string): string {
  const name = openedBy === "" ? intl.formatMessage(messages.nobody) : openedBy;
  return intl.formatMessage(messages.openedBy, { name });
}

interface BlockProps {
  restaurant: Restaurant;
  name: string;
  openedBy: string;
  /** Prints the document of the block, from the full state at the click. */
  onPrint: (opener: HTMLElement) => void;
  children: ReactNode;
}

/** Name in the restaurant's colour with its « Imprimer » icon button, « Ouvert par », then the lines (07 § 5). */
function Block({ restaurant, name, openedBy, onPrint, children }: BlockProps) {
  const intl = useIntl();
  const label = intl.formatMessage(messages.print);
  return (
    <div className={styles["block"]} data-accent={restaurant}>
      <div className={styles["blockHead"]}>
        <h3 className={styles["blockName"]}>{name}</h3>
        <IconButton
          aria-label={label}
          title={label}
          onClick={(event) => {
            onPrint(event.currentTarget);
          }}
        >
          <PrintIcon />
        </IconButton>
      </div>
      <p className={styles["meta"]}>{openedByText(intl, openedBy)}</p>
      {children}
    </div>
  );
}

/** « Réservés : 15 / 20 couverts — 95,20 € », then « Clients : … » when someone booked (07 § 5). */
function LinesR1({ list }: { list: ListR1 }) {
  const intl = useIntl();
  const { day, totals, bookings } = list;
  const capacity = day?.capacity ?? 0;
  return (
    <>
      <p className={styles["line"]}>
        {totals.price > 0 ? (
          <FormattedMessage
            id="staff.tomorrow.r1.bookedWithPrice"
            defaultMessage="Réservés : {seats} / {capacity} couverts — {price}"
            description="07 § 5 — couverts réservés de demain au restaurant 1 et somme des prix"
            values={{ seats: totals.seats, capacity, price: formatEuros(totals.price) }}
          />
        ) : (
          <FormattedMessage
            id="staff.tomorrow.r1.booked"
            defaultMessage="Réservés : {seats} / {capacity} couverts"
            description="07 § 5 — couverts réservés de demain au restaurant 1, sans prix"
            values={{ seats: totals.seats, capacity }}
          />
        )}
      </p>
      {bookings.length > 0 ? (
        <p className={styles["meta"]}>
          <FormattedMessage
            id="staff.tomorrow.r1.customers"
            defaultMessage="Clients : {names}"
            description="07 § 5 — personnes inscrites demain au restaurant 1, dans l'ordre de la feuille"
            values={{
              names: commaList(
                intl,
                bookings.map((booking) =>
                  intl.formatMessage(messages.customer, {
                    name: booking.name,
                    className: booking.className,
                  }),
                ),
              ),
            }}
          />
        </p>
      ) : null}
    </>
  );
}

/** « • Lasagnes : 1 portion — 4,50 € (Noah Bernard) » (07 § 5, annexe F); one voucher per order (E-16). */
function dishLineText(intl: IntlShape, total: DishTotal): string {
  const line = withPrice(
    intl.formatMessage(messages.dishLine, { name: total.dish.name, n: total.portions }),
    amountsText(total.amounts),
  );
  const names = commaList(
    intl,
    total.bookings.map((booking) => booking.name),
  );
  return intl.formatMessage(messages.dishCustomers, { line, names });
}

/** A line per booked dish, then « Total {name2} : … »; « Aucun plat ouvert. » without dishes (07 § 5, D-03). */
function LinesR2({ list }: { list: ListR2 }) {
  const intl = useIntl();
  if (list.dishes.length === 0) {
    return (
      <p className={styles["meta"]}>
        <FormattedMessage
          id="staff.tomorrow.r2.noDish"
          defaultMessage="Aucun plat ouvert."
          description="07 § 5 — bloc du restaurant 2 d'un jour sans plat"
        />
      </p>
    );
  }
  const { amounts } = list.totals;
  const values = { name: list.restaurantName, amounts: amountsText(amounts) };
  return (
    <>
      {list.dishes
        .filter((total) => total.bookings.length > 0)
        .map((total) => (
          <p key={total.dish.id} className={styles["line"]}>
            {dishLineText(intl, total)}
          </p>
        ))}
      {hasAmounts(amounts) ? (
        <p className={styles["blockTotal"]}>
          <FormattedMessage
            {...(amounts.gap ? messages.totalR2WithGap : messages.totalR2)}
            values={values}
          />
        </p>
      ) : null}
    </>
  );
}

interface TomorrowBlocksProps {
  /** Tomorrow in Paris, as the panel's title shows it. */
  tomorrow: IsoDate;
}

/** Blocks of restaurant 1 and restaurant 2 for `tomorrow`, each when its day is open (07 § 5, D-07). */
export function TomorrowBlocks({ tomorrow }: TomorrowBlocksProps) {
  const state = useStaffState(whole);
  const r1 = listR1(state, tomorrow);
  const r2 = listR2(state, tomorrow);
  if (r1.day === undefined && r2.day === undefined) {
    return (
      <p className={styles["meta"]}>
        <FormattedMessage
          id="staff.tomorrow.noDay"
          defaultMessage="Aucun jour ouvert pour demain."
          description="07 § 5 — panneau « Demain » quand aucun restaurant n'a de jour ouvert demain"
        />
      </p>
    );
  }
  return (
    <div className={styles["blocks"]}>
      {r1.day === undefined ? null : (
        <Block
          restaurant="r1"
          name={r1.restaurantName}
          openedBy={r1.day.openedBy}
          onPrint={(opener) => {
            void printTomorrowR1(state, tomorrow, opener);
          }}
        >
          <LinesR1 list={r1} />
        </Block>
      )}
      {r2.day === undefined ? null : (
        <Block
          restaurant="r2"
          name={r2.restaurantName}
          openedBy={r2.day.openedBy}
          onPrint={(opener) => {
            void printTomorrowR2(state, tomorrow, opener);
          }}
        >
          <LinesR2 list={r2} />
        </Block>
      )}
    </div>
  );
}
