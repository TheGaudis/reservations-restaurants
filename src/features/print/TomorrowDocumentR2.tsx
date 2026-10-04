import { defineMessages, useIntl } from "react-intl";
import type { IntlShape } from "react-intl";

import { bookingAmounts } from "@/domain/print";
import type { DishTotal, ListR2 } from "@/domain/print";
import logoUrl from "@/features/page/logo.png";
import {
  documentMessages,
  dotted,
  openedByText,
  tomorrowSubtitle,
} from "@/features/print/document-texts";
import { bookedText, r2Messages } from "@/features/print/list-r2";
import { amountsText, dishPriceText, withPrice } from "@/intl/amounts";
import { PrintLayout, PrintNote } from "@/ui/print/PrintLayout";
import { PrintTable } from "@/ui/print/PrintTable";
import type { PrintColumn } from "@/ui/print/PrintTable";

const messages = defineMessages<{
  noDishOpen: Record<string, never>;
  unitPrice: { price: string };
}>({
  noDishOpen: {
    id: "print.r2.tomorrow.noDish",
    defaultMessage: "Aucun plat ouvert.",
    description: "07 § 7 — résumé R2 du lendemain d'un jour sans plat",
  },
  unitPrice: {
    id: "print.r2.tomorrow.unitPrice",
    defaultMessage: "{price} l''unité",
    description: "07 § 7 — prix en euros d'un plat dans son titre (« Lasagnes — 4,50 € l'unité »)",
  },
});

function columns(intl: IntlShape): PrintColumn[] {
  return [
    { key: "name", label: intl.formatMessage(documentMessages.name) },
    { key: "className", label: intl.formatMessage(r2Messages.className) },
    { key: "portions", label: intl.formatMessage(r2Messages.portions), align: "end" },
    { key: "price", label: intl.formatMessage(documentMessages.price), align: "end" },
  ];
}

/** « {Nom}[ — {prix}][ l'unité] »: « l'unité » for a price in euros only (07 § 7). */
function dishTitle(intl: IntlShape, total: DishTotal): string {
  const price = dishPriceText(total.dish);
  const euros = price !== "" && !total.dish.voucher;
  return withPrice(
    total.dish.name,
    euros ? intl.formatMessage(messages.unitPrice, { price }) : price,
  );
}

/** One dish: its title with « {réservées} / {Stock} » on the right, then its bookings (07 § 7). */
function DishSection({ total }: { total: DishTotal }) {
  const intl = useIntl();
  return (
    <section>
      <h3>
        {dishTitle(intl, total)}
        <span>{bookedText(intl, total)}</span>
      </h3>
      <PrintTable
        columns={columns(intl)}
        rows={total.bookings.map((booking) => ({
          key: booking.id,
          cells: [
            booking.name,
            booking.className,
            booking.portions,
            amountsText(bookingAmounts(total.dish, booking.portions)),
          ],
        }))}
        empty={intl.formatMessage(documentMessages.noBookings)}
      />
    </section>
  );
}

/** Body of document D: no day, no dish, or one section per dish in the order of the sheet (07 § 7). */
function Body({ list }: { list: ListR2 }) {
  const intl = useIntl();
  if (list.day === undefined) {
    return <PrintNote>{intl.formatMessage(documentMessages.noDayTomorrow)}</PrintNote>;
  }
  if (list.dishes.length === 0) {
    return <PrintNote>{intl.formatMessage(messages.noDishOpen)}</PrintNote>;
  }
  return list.dishes.map((total) => <DishSection key={total.dish.id} total={total} />);
}

interface TomorrowDocumentR2Props {
  /** Snapshot of tomorrow in the full state at the click (PLAN § 3.8). */
  list: ListR2;
  /** Time of the click, in ms. */
  printedAt: number;
}

/**
 * Document D, R2 summary of tomorrow (07 § 7): « Ouvert par » only, one heading and one table per dish, total of the
 * portions and amounts with one voucher per order (E-16), no signature.
 */
export function TomorrowDocumentR2({ list, printedAt }: TomorrowDocumentR2Props) {
  const intl = useIntl();
  const { day, totals } = list;
  return (
    <PrintLayout
      accent="r2"
      logo={logoUrl}
      printedAt={printedAt}
      heading={list.restaurantName}
      subtitle={tomorrowSubtitle(list.iso)}
      infos={
        day === undefined
          ? []
          : [
              {
                key: "openedBy",
                label: intl.formatMessage(documentMessages.openedBy),
                value: openedByText(day.openedBy),
              },
            ]
      }
      total={
        day === undefined || list.dishes.length === 0
          ? undefined
          : {
              label: intl.formatMessage(documentMessages.total),
              value: dotted([
                intl.formatMessage(r2Messages.portionCount, { count: totals.portions }),
                amountsText(totals.amounts),
              ]),
            }
      }
    >
      <Body list={list} />
    </PrintLayout>
  );
}
