import { FormattedMessage, useIntl } from "react-intl";
import type { IntlShape } from "react-intl";

import { bookingAmounts } from "@/domain/print";
import type { ListR2, Order } from "@/domain/print";
import logoUrl from "@/features/page/logo.png";
import { documentMessages } from "@/features/print/document-texts";
import {
  customerColumns,
  dishColumns,
  dishRow,
  listInfosR2,
  listTotalR2,
  modesText,
  noDishText,
} from "@/features/print/list-r2";
import { amountsText, withPrice } from "@/intl/amounts";
import { formatLongDate } from "@/intl/dates";
import { PrintLayout } from "@/ui/print/PrintLayout";
import { PrintTable } from "@/ui/print/PrintTable";
import type { PrintRow } from "@/ui/print/PrintTable";

/**
 * « Plats » of a customer: one line per booking, « **{qte}×** {plat}[ — {montant}] », then its observation in bold
 * italics (07 § 4.2); a voucher dish counts one voucher (E-16).
 */
function DishLines({ order }: { order: Order }) {
  return order.lines.map((line, index) => (
    <span key={line.bookingId}>
      {index > 0 ? <br /> : null}
      <FormattedMessage
        id="print.r2.list.dishLine"
        defaultMessage="<b>{count}×</b> {dish}"
        description="07 § 4.2 — ligne d'un plat dans la colonne « Plats » (« 1× Lasagnes — 4,50 € »)"
        values={{
          count: line.portions,
          dish: withPrice(line.dish.name, amountsText(bookingAmounts(line.dish, line.portions))),
        }}
      />
      {line.observation === "" ? null : (
        <>
          <br />
          <b>
            <i>{line.observation}</i>
          </b>
        </>
      )}
    </span>
  ));
}

function customerRow(intl: IntlShape, order: Order): PrintRow {
  return {
    key: order.key,
    cells: [
      order.name,
      order.className,
      <DishLines key="dishes" order={order} />,
      order.portions,
      amountsText(order.amounts),
      <b key="mode">{modesText(intl, order.serviceModes)}</b>,
      order.contact,
    ],
  };
}

interface ListDocumentR2Props {
  /** Snapshot of the full state at the click (PLAN § 3.8). */
  list: ListR2;
  /** Time of the click, in ms. */
  printedAt: number;
}

/**
 * Document B, list of an R2 day (07 § 4): one row per customer, sorted by class then name (07 § 4.1, D-08), then the
 * summary of every dish of the day, the day's total with one voucher per order (E-16) and the signature.
 */
export function ListDocumentR2({ list, printedAt }: ListDocumentR2Props) {
  const intl = useIntl();
  return (
    <PrintLayout
      accent="r2"
      logo={logoUrl}
      printedAt={printedAt}
      heading={list.restaurantName}
      subtitle={formatLongDate(list.iso)}
      infos={listInfosR2(intl, list.day)}
      total={listTotalR2(intl, list.totals)}
      signature
    >
      <h2>
        <FormattedMessage
          id="print.r2.list.byCustomer"
          defaultMessage="Par client ({count})"
          description="07 § 4.2 — titre du tableau des clients ; count : nombre de clients"
          values={{ count: list.orders.length }}
        />
      </h2>
      <PrintTable
        columns={customerColumns(intl)}
        rows={list.orders.map((order) => customerRow(intl, order))}
        empty={intl.formatMessage(documentMessages.noBookings)}
      />
      <h2>
        <FormattedMessage
          id="print.r2.list.byDish"
          defaultMessage="Récapitulatif par plat"
          description="07 § 4.2 — titre du tableau des plats"
        />
      </h2>
      <PrintTable
        columns={dishColumns(intl)}
        rows={list.dishes.map((total) => dishRow(intl, total))}
        empty={noDishText(intl)}
      />
    </PrintLayout>
  );
}
