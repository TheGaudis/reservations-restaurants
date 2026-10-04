import { defineMessages, FormattedMessage, useIntl } from "react-intl";
import type { IntlShape } from "react-intl";

import type { ListR1 } from "@/domain/print";
import type { StaffServiceDayR1 } from "@/domain/types";
import logoUrl from "@/features/page/logo.png";
import {
  bookingPriceText,
  documentMessages,
  dotted,
  openedByText,
  seatsBookedText,
  tomorrowSubtitle,
} from "@/features/print/document-texts";
import { formatEuros, seatsText } from "@/intl/amounts";
import { PrintLayout, PrintNote } from "@/ui/print/PrintLayout";
import type { PrintInfo } from "@/ui/print/PrintLayout";
import { PrintTable } from "@/ui/print/PrintTable";
import type { PrintColumn } from "@/ui/print/PrintTable";

const messages = defineMessages({
  className: {
    id: "print.r1.tomorrow.column.className",
    defaultMessage: "Classe",
    description: "07 § 6 — colonne du résumé R1 du lendemain",
  },
});

function infos(intl: IntlShape, day: StaffServiceDayR1, seats: number): PrintInfo[] {
  return [
    {
      key: "openedBy",
      label: intl.formatMessage(documentMessages.openedBy),
      value: openedByText(day.openedBy),
    },
    {
      key: "places",
      label: intl.formatMessage(documentMessages.places),
      value: seatsBookedText(seats, day.capacity),
    },
  ];
}

function columns(intl: IntlShape): PrintColumn[] {
  return [
    { key: "name", label: intl.formatMessage(documentMessages.name) },
    { key: "className", label: intl.formatMessage(messages.className) },
    { key: "seats", label: intl.formatMessage(documentMessages.seats), align: "end" },
    { key: "price", label: intl.formatMessage(documentMessages.price), align: "end" },
  ];
}

interface TomorrowDocumentR1Props {
  /** Snapshot of tomorrow in the full state at the click (PLAN § 3.8). */
  list: ListR1;
  /** Time of the click, in ms. */
  printedAt: number;
}

/**
 * Document C, R1 summary of tomorrow (07 § 6): « Ouvert par » and « Places » only, plain table in the order of the
 * sheet (D-08 not retained), total without the detail, no signature.
 */
export function TomorrowDocumentR1({ list, printedAt }: TomorrowDocumentR1Props) {
  const intl = useIntl();
  const { day, totals } = list;
  return (
    <PrintLayout
      accent="r1"
      logo={logoUrl}
      printedAt={printedAt}
      heading={list.restaurantName}
      subtitle={tomorrowSubtitle(list.iso)}
      infos={day === undefined ? [] : infos(intl, day, totals.seats)}
      total={
        day === undefined
          ? undefined
          : {
              label: intl.formatMessage(documentMessages.total),
              value: dotted([
                seatsText(totals.seats),
                totals.price > 0 ? formatEuros(totals.price) : "",
              ]),
            }
      }
    >
      {day === undefined ? (
        <PrintNote>
          <FormattedMessage {...documentMessages.noDayTomorrow} />
        </PrintNote>
      ) : (
        <PrintTable
          columns={columns(intl)}
          rows={list.bookings.map((booking) => ({
            key: booking.id,
            cells: [booking.name, booking.className, booking.seats, bookingPriceText(booking)],
          }))}
          empty={intl.formatMessage(documentMessages.noBookings)}
        />
      )}
    </PrintLayout>
  );
}
