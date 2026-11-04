import { defineMessage, FormattedMessage, useIntl } from "react-intl";
import type { IntlShape } from "react-intl";

import type { ListR1, R1Totals } from "@/domain/print";
import type { BookingR1 } from "@/domain/types";
import {
  dotted,
  joinParts,
  nameColumn,
  NoBookingsRow,
  NoDayTomorrowNote,
  OpenedByInfo,
  PrintFrame,
  PrintInfo,
  PrintNote,
  PrintTotal,
  priceColumn,
} from "@/features/print/PrintFrame";
import { formatEuros, seatsText } from "@/intl/amounts";

import frame from "@/features/print/PrintFrame.module.css";
import styles from "@/features/print/PrintListR1.module.css";

// Documents A (list of an R1 day, 07 § 3) and C (summary of tomorrow, 07 § 6, `printDayR1(date, tomorrow)`).
// Bookings in the order of the sheet (D-08 not retained).

const seatsColumn = defineMessage({
  id: "print.r1.column.seats",
  defaultMessage: "Couverts",
  description: "07 § 3, § 6 — colonne des tableaux R1",
});

const studentCountMessage = defineMessage<{ count: number }>({
  id: "print.r1.list.total.students",
  defaultMessage: "{count, plural, one {# élève} other {# élèves}}",
  description: "07 § 3 — détail du total (« 8 élèves »)",
});

const staffCountMessage = defineMessage<{ count: number }>({
  id: "print.r1.list.total.staffMembers",
  defaultMessage: "{count, plural, one {# personnel} other {# personnels}}",
  description: "07 § 3 — détail du total (« 3 personnels »)",
});

const externalCountMessage = defineMessage<{ count: number }>({
  id: "print.r1.list.total.externals",
  defaultMessage: "{count, plural, one {# extérieur} other {# extérieurs}}",
  description: "07 § 3 — détail du total (« 1 extérieur »)",
});

const commaMessage = defineMessage<{ before: string; after: string }>({
  id: "print.r1.list.total.comma",
  defaultMessage: "{before}, {after}",
  description: "07 § 3 — séparateur du détail du total (« 8 élèves, 3 personnels »)",
});

/** Price of a booking: empty without a price or for 0 (07 § 3, `spec/README.md` § 4.1). */
function priceText(booking: BookingR1): string {
  return booking.total === null || booking.total === 0 ? "" : formatEuros(booking.total);
}

/**
 * « 12 couverts · 8 élèves, 3 personnels, 1 extérieur · 67,80 € » (07 § 3); the detail only on document A, when the
 * counters add up to the seats; document C: seats and price (07 § 6).
 */
function totalText(intl: IntlShape, totals: R1Totals, withDetail: boolean): string {
  const counts = [
    [totals.students, studentCountMessage],
    [totals.staffMembers, staffCountMessage],
    [totals.externals, externalCountMessage],
  ] as const;
  const detail =
    withDetail && totals.detailed
      ? counts
          .filter(([count]) => count > 0)
          .map(([count, message]) => intl.formatMessage(message, { count }))
      : [];
  return dotted(intl, [
    seatsText(totals.seats),
    joinParts(detail, (before, after) => intl.formatMessage(commaMessage, { before, after })),
    totals.price > 0 ? formatEuros(totals.price) : "",
  ]);
}

/** A count of document A; 0 or empty: a greyed dash (`Number(v) || '–'` of `printDayR1`). */
function CountCell({ value }: { value: number | null }) {
  if (value !== null && value !== 0) {
    return (
      <td className={styles["count"]} data-align="center">
        {value}
      </td>
    );
  }
  return (
    <td className={styles["count"]} data-align="center" data-tone="muted">
      <FormattedMessage
        id="print.r1.list.noCount"
        defaultMessage="–"
        description="07 § 3 — case Élèves, Pers. ou Ext. vide ou à 0, grisée"
      />
    </td>
  );
}

/** Framed table of document A: group headers, eleven columns, the last two empty, to fill in the room (07 § 3). */
function ListTable({ bookings }: { bookings: readonly BookingR1[] }) {
  return (
    <table className={frame["table"]} data-variant="grid">
      <thead>
        <tr className={frame["groups"]}>
          <th colSpan={2}>
            <FormattedMessage
              id="print.r1.list.group.customer"
              defaultMessage="Client"
              description="07 § 3 — en-tête de groupe (Nom, Classe ou service)"
            />
          </th>
          <th colSpan={5} data-align="center">
            <FormattedMessage
              id="print.r1.list.group.booking"
              defaultMessage="Réservation"
              description="07 § 3 — en-tête de groupe (Élèves à Prix)"
            />
          </th>
          <th colSpan={2}>
            <FormattedMessage
              id="print.r1.list.group.information"
              defaultMessage="Informations"
              description="07 § 3 — en-tête de groupe (Contact, Observation)"
            />
          </th>
          <th colSpan={2} data-align="center">
            <FormattedMessage
              id="print.r1.list.group.room"
              defaultMessage="À remplir en salle"
              description="07 § 3 — en-tête de groupe (N° table, Chef de rang)"
            />
          </th>
        </tr>
        <tr>
          <th scope="col" className={styles["name"]}>
            <FormattedMessage {...nameColumn} />
          </th>
          <th scope="col" className={styles["className"]}>
            <FormattedMessage
              id="print.r1.list.column.className"
              defaultMessage="Classe ou service"
              description="07 § 3 — colonne de la liste R1"
            />
          </th>
          <th scope="col" className={styles["count"]} data-align="center">
            <FormattedMessage
              id="print.r1.list.column.students"
              defaultMessage="Élèves"
              description="07 § 3 — colonne de la liste R1"
            />
          </th>
          <th scope="col" className={styles["count"]} data-align="center">
            <FormattedMessage
              id="print.r1.list.column.staffMembers"
              defaultMessage="Pers."
              description="07 § 3 — colonne de la liste R1 (personnels)"
            />
          </th>
          <th scope="col" className={styles["count"]} data-align="center">
            <FormattedMessage
              id="print.r1.list.column.externals"
              defaultMessage="Ext."
              description="07 § 3 — colonne de la liste R1 (extérieurs)"
            />
          </th>
          <th scope="col" className={styles["seats"]} data-align="center">
            <FormattedMessage {...seatsColumn} />
          </th>
          <th scope="col" className={styles["price"]} data-align="end">
            <FormattedMessage {...priceColumn} />
          </th>
          <th scope="col" className={styles["contact"]}>
            <FormattedMessage
              id="print.r1.list.column.contact"
              defaultMessage="Contact"
              description="07 § 3 — colonne de la liste R1"
            />
          </th>
          <th scope="col">
            <FormattedMessage
              id="print.r1.list.column.observation"
              defaultMessage="Observation"
              description="07 § 3 — colonne de la liste R1"
            />
          </th>
          <th scope="col" className={styles["tableNumber"]} data-align="center">
            <FormattedMessage
              id="print.r1.list.column.tableNumber"
              defaultMessage="N° table"
              description="07 § 3 — colonne vide, à remplir en salle"
            />
          </th>
          <th scope="col" className={styles["headWaiter"]} data-align="center">
            <FormattedMessage
              id="print.r1.list.column.headWaiter"
              defaultMessage="Chef de rang"
              description="07 § 3 — colonne vide, à remplir en salle"
            />
          </th>
        </tr>
      </thead>
      <tbody>
        {bookings.length === 0 ? <NoBookingsRow columns={11} /> : null}
        {bookings.map((booking) => (
          <tr key={booking.id}>
            <td className={styles["name"]}>{booking.name}</td>
            <td className={styles["className"]}>{booking.className}</td>
            <CountCell value={booking.students} />
            <CountCell value={booking.staffMembers} />
            <CountCell value={booking.externals} />
            <td className={styles["seats"]} data-align="center">
              {booking.seats}
            </td>
            <td className={styles["price"]} data-align="end">
              {priceText(booking)}
            </td>
            <td className={styles["contact"]}>{booking.contact}</td>
            <td data-tone={booking.observation === "" ? undefined : "marked"}>
              {booking.observation}
            </td>
            <td className={styles["tableNumber"]} data-align="center" />
            <td className={styles["headWaiter"]} data-align="center" />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Plain table of document C: name, class, seats and price (07 § 6). */
function TomorrowTable({ bookings }: { bookings: readonly BookingR1[] }) {
  return (
    <table className={frame["table"]}>
      <thead>
        <tr>
          <th scope="col">
            <FormattedMessage {...nameColumn} />
          </th>
          <th scope="col">
            <FormattedMessage
              id="print.r1.tomorrow.column.className"
              defaultMessage="Classe"
              description="07 § 6 — colonne du résumé R1 du lendemain"
            />
          </th>
          <th scope="col" data-align="end">
            <FormattedMessage {...seatsColumn} />
          </th>
          <th scope="col" data-align="end">
            <FormattedMessage {...priceColumn} />
          </th>
        </tr>
      </thead>
      <tbody>
        {bookings.length === 0 ? <NoBookingsRow columns={4} /> : null}
        {bookings.map((booking) => (
          <tr key={booking.id}>
            <td>{booking.name}</td>
            <td>{booking.className}</td>
            <td data-align="end">{booking.seats}</td>
            <td data-align="end">{priceText(booking)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface PrintListR1Props {
  /** Snapshot of the full state at the click (PLAN § 3.8). */
  list: ListR1;
  /** Document C, summary of tomorrow: no theme, menu, detail, contact, observation nor signature (07 § 6). */
  tomorrow: boolean;
  /** Time of the click, in ms. */
  printedAt: number;
}

/**
 * Document A or C. A day missing at the click: « Ce jour n'est plus ouvert. » on A (a-24), « Aucun jour ouvert pour
 * demain. » on C, without informations nor total.
 */
export function PrintListR1({ list, tomorrow, printedAt }: PrintListR1Props) {
  const intl = useIntl();
  const { day, totals } = list;
  return (
    <PrintFrame
      accent="r1"
      printedAt={printedAt}
      heading={list.restaurantName}
      iso={list.iso}
      tomorrow={tomorrow}
      signature={!tomorrow}
      infos={
        day === undefined ? undefined : (
          <>
            {tomorrow || day.theme === "" ? null : (
              <PrintInfo
                label={
                  <FormattedMessage
                    id="print.r1.list.info.theme"
                    defaultMessage="Thème"
                    description="07 § 3 — information « Thème » de la liste R1"
                  />
                }
              >
                {day.theme}
              </PrintInfo>
            )}
            {tomorrow || day.menu === "" ? null : (
              <PrintInfo
                wide
                label={
                  <FormattedMessage
                    id="print.r1.list.info.menu"
                    defaultMessage="Menu"
                    description="07 § 3 — information « Menu » de la liste R1 (colonne large)"
                  />
                }
              >
                {day.menu}
              </PrintInfo>
            )}
            <OpenedByInfo openedBy={day.openedBy} />
            <PrintInfo
              label={
                <FormattedMessage
                  id="print.r1.info.places"
                  defaultMessage="Places"
                  description="07 § 3, § 6 — intitulé d'une information du document R1"
                />
              }
            >
              <FormattedMessage
                id="print.r1.info.seatsBooked"
                defaultMessage="{seats} / {capacity} couverts réservés"
                description="07 § 3, § 6 — valeur de l'information « Places »"
                values={{ seats: totals.seats, capacity: day.capacity }}
              />
            </PrintInfo>
          </>
        )
      }
    >
      {day === undefined && tomorrow ? <NoDayTomorrowNote /> : null}
      {day === undefined && !tomorrow ? (
        <PrintNote>
          <FormattedMessage
            id="print.r1.list.dayClosed"
            defaultMessage="Ce jour n'est plus ouvert."
            description="PLAN annexe F, a-24 — liste imprimée R1 d'un jour supprimé entre-temps (remplace « Aucun jour ouvert pour demain. »)"
          />
        </PrintNote>
      ) : null}
      {day === undefined ? null : (
        <>
          {tomorrow ? (
            <TomorrowTable bookings={list.bookings} />
          ) : (
            <ListTable bookings={list.bookings} />
          )}
          <PrintTotal>{totalText(intl, totals, !tomorrow)}</PrintTotal>
        </>
      )}
    </PrintFrame>
  );
}
