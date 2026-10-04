import { useIntl } from "react-intl";

import type { ListR1 } from "@/domain/print";
import logoUrl from "@/features/page/logo.png";
import { documentMessages } from "@/features/print/document-texts";
import {
  dayClosedText,
  listColumnsR1,
  listGroupsR1,
  listInfosR1,
  listRowR1,
  listTotalR1,
} from "@/features/print/list-r1";
import { formatLongDate } from "@/intl/dates";
import { PrintLayout, PrintNote } from "@/ui/print/PrintLayout";
import { PrintTable } from "@/ui/print/PrintTable";

interface ListDocumentR1Props {
  /** Snapshot of the full state at the click (PLAN § 3.8). */
  list: ListR1;
  /** Time of the click, in ms. */
  printedAt: number;
}

/**
 * Document A, list of an R1 day (07 § 3): framed table in the order of the sheet (D-08 not retained), two empty
 * columns to fill in the room, total and signature. A day deleted since: « Ce jour n'est plus ouvert. » (a-24).
 */
export function ListDocumentR1({ list, printedAt }: ListDocumentR1Props) {
  const intl = useIntl();
  const { day, totals } = list;
  return (
    <PrintLayout
      accent="r1"
      logo={logoUrl}
      printedAt={printedAt}
      heading={list.restaurantName}
      subtitle={formatLongDate(list.iso)}
      infos={day === undefined ? [] : listInfosR1(intl, day, totals.seats)}
      total={
        day === undefined
          ? undefined
          : { label: intl.formatMessage(documentMessages.total), value: listTotalR1(intl, totals) }
      }
      signature
    >
      {day === undefined ? (
        <PrintNote>{dayClosedText(intl)}</PrintNote>
      ) : (
        <PrintTable
          variant="grid"
          groups={listGroupsR1(intl)}
          columns={listColumnsR1(intl)}
          rows={list.bookings.map((booking) => listRowR1(intl, booking))}
          empty={intl.formatMessage(documentMessages.noBookings)}
        />
      )}
    </PrintLayout>
  );
}
