import { defineMessage, FormattedMessage, useIntl } from "react-intl";
import type { IntlShape } from "react-intl";

import { bookingAmounts } from "@/domain/print";
import type { DishTotal, ListR2, Order } from "@/domain/print";
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
import { amountsText, dishPriceText, withPrice } from "@/intl/amounts";
import { dineInLabel, takeawayLabel } from "@/intl/common-messages";

import frame from "@/features/print/PrintFrame.module.css";

// Documents B (list of an R2 day, 07 § 4) and D (summary of tomorrow, 07 § 7). One voucher per order in every
// amount (E-16); bookings of a deleted dish left out (b-3, D-07).

const classColumn = defineMessage({
  id: "print.r2.column.className",
  defaultMessage: "Classe",
  description: "07 § 4.2, § 7 — colonne des tableaux R2",
});

const portionsColumn = defineMessage({
  id: "print.r2.column.portions",
  defaultMessage: "Portions",
  description: "07 § 4.2, § 7 — colonne des tableaux R2",
});

const portionCountMessage = defineMessage<{ count: number }>({
  id: "print.r2.total.portions",
  defaultMessage: "{count, plural, one {# portion} other {# portions}}",
  description: "07 § 4.2, § 7 — nombre de portions du total (« 4 portions »)",
});

const clientsMessage = defineMessage<{ count: number }>({
  id: "print.r2.list.total.clients",
  defaultMessage: "{count, plural, one {# client} other {# clients}}",
  description: "07 § 4.2 — nombre de clients du total (« 2 clients »)",
});

const modesMessage = defineMessage<{ before: string; after: string }>({
  id: "print.r2.list.modes",
  defaultMessage: "{before} + {after}",
  description: "07 § 4.2 — modes d'un client joints par « + » (« À emporter + Sur place »)",
});

const unitPriceMessage = defineMessage<{ price: string }>({
  id: "print.r2.tomorrow.unitPrice",
  defaultMessage: "{price} l''unité",
  description: "07 § 7 — prix en euros d'un plat dans son titre (« Lasagnes — 4,50 € l'unité »)",
});

/** « {réservées} / {Stock} » of a dish (07 § 4.2, § 7). */
function BookedOfStock({ total }: { total: DishTotal }) {
  return (
    <FormattedMessage
      id="print.r2.dish.booked"
      defaultMessage="{portions} / {stock}"
      description="07 § 4.2, § 7 — portions réservées sur le stock d'un plat (« 3 / 10 »)"
      values={{ portions: total.portions, stock: total.dish.stock }}
    />
  );
}

/** Modes of a customer joined by « + », in the order of the bookings (07 § 4.1). */
function modesText(intl: IntlShape, order: Order): string {
  const labels = order.serviceModes.map((mode) =>
    intl.formatMessage(mode === "takeaway" ? takeawayLabel : dineInLabel),
  );
  return joinParts(labels, (before, after) => intl.formatMessage(modesMessage, { before, after }));
}

/**
 * « Plats » of a customer: one line per booking, « **{qte}×** {plat}[ — {montant}] », then its observation in bold
 * italics (07 § 4.2).
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

/** Document B: one row per customer sorted by class then name (07 § 4.1, D-08), then every dish of the day. */
function ListBody({ list }: { list: ListR2 }) {
  const intl = useIntl();
  return (
    <>
      <h2>
        <FormattedMessage
          id="print.r2.list.byCustomer"
          defaultMessage="Par client ({count})"
          description="07 § 4.2 — titre du tableau des clients ; count : nombre de clients"
          values={{ count: list.orders.length }}
        />
      </h2>
      <table className={frame["table"]}>
        <thead>
          <tr>
            <th scope="col">
              <FormattedMessage {...nameColumn} />
            </th>
            <th scope="col">
              <FormattedMessage {...classColumn} />
            </th>
            <th scope="col">
              <FormattedMessage
                id="print.r2.list.column.dishes"
                defaultMessage="Plats"
                description="07 § 4.2 — colonne du tableau « Par client »"
              />
            </th>
            <th scope="col" data-align="end">
              <FormattedMessage {...portionsColumn} />
            </th>
            <th scope="col" data-align="end">
              <FormattedMessage {...priceColumn} />
            </th>
            <th scope="col">
              <FormattedMessage
                id="print.r2.list.column.mode"
                defaultMessage="Mode"
                description="07 § 4.2 — colonne du tableau « Par client »"
              />
            </th>
            <th scope="col">
              <FormattedMessage
                id="print.r2.list.column.contact"
                defaultMessage="Contact"
                description="07 § 4.2 — colonne du tableau « Par client »"
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {list.orders.length === 0 ? <NoBookingsRow columns={7} /> : null}
          {list.orders.map((order) => (
            <tr key={order.key}>
              <td>{order.name}</td>
              <td>{order.className}</td>
              <td>
                <DishLines order={order} />
              </td>
              <td data-align="end">{order.portions}</td>
              <td data-align="end">{amountsText(order.amounts)}</td>
              <td>
                <b>{modesText(intl, order)}</b>
              </td>
              <td>{order.contact}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>
        <FormattedMessage
          id="print.r2.list.byDish"
          defaultMessage="Récapitulatif par plat"
          description="07 § 4.2 — titre du tableau des plats"
        />
      </h2>
      <table className={frame["table"]}>
        <thead>
          <tr>
            <th scope="col">
              <FormattedMessage
                id="print.r2.list.column.dish"
                defaultMessage="Plat"
                description="07 § 4.2 — colonne du récapitulatif par plat"
              />
            </th>
            <th scope="col" data-align="end">
              <FormattedMessage
                id="print.r2.list.column.unitPrice"
                defaultMessage="Prix unitaire"
                description="07 § 4.2 — colonne du récapitulatif par plat"
              />
            </th>
            <th scope="col" data-align="end">
              <FormattedMessage {...portionsColumn} />
            </th>
            <th scope="col" data-align="end">
              <FormattedMessage
                id="print.r2.list.column.amount"
                defaultMessage="Montant"
                description="07 § 4.2 — colonne du récapitulatif par plat"
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {list.dishes.length === 0 ? (
            <tr>
              <td className={frame["empty"]} colSpan={4}>
                <FormattedMessage
                  id="print.r2.list.noDish"
                  defaultMessage="Aucun plat."
                  description="07 § 4.2 — récapitulatif par plat d'un jour sans plat"
                />
              </td>
            </tr>
          ) : null}
          {list.dishes.map((total) => (
            <tr key={total.dish.id}>
              <td>{total.dish.name}</td>
              <td data-align="end">{dishPriceText(total.dish)}</td>
              <td data-align="end">
                <BookedOfStock total={total} />
              </td>
              <td data-align="end">{amountsText(total.amounts)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <PrintTotal
        label={
          <FormattedMessage
            id="print.r2.list.total.label"
            defaultMessage="Total du jour"
            description="07 § 4.2 — intitulé du total de la liste R2"
          />
        }
      >
        {dotted(intl, [
          intl.formatMessage(clientsMessage, { count: list.totals.clients }),
          intl.formatMessage(portionCountMessage, { count: list.totals.portions }),
          amountsText(list.totals.amounts),
        ])}
      </PrintTotal>
    </>
  );
}

/** « {Nom}[ — {prix}][ l'unité] »: « l'unité » for a price in euros only (07 § 7). */
function dishTitle(intl: IntlShape, total: DishTotal): string {
  const price = dishPriceText(total.dish);
  const euros = price !== "" && !total.dish.voucher;
  return withPrice(
    total.dish.name,
    euros ? intl.formatMessage(unitPriceMessage, { price }) : price,
  );
}

/** Document D: one `h3` and one table per dish in the order of the sheet (07 § 7, REG-42). */
function TomorrowBody({ list }: { list: ListR2 }) {
  const intl = useIntl();
  if (list.day === undefined) return <NoDayTomorrowNote />;
  if (list.dishes.length === 0) {
    return (
      <PrintNote>
        <FormattedMessage
          id="print.r2.tomorrow.noDish"
          defaultMessage="Aucun plat ouvert."
          description="07 § 7 — résumé R2 du lendemain d'un jour sans plat"
        />
      </PrintNote>
    );
  }
  return (
    <>
      {list.dishes.map((total) => (
        <section key={total.dish.id}>
          <h3>
            {dishTitle(intl, total)}
            <span>
              <BookedOfStock total={total} />
            </span>
          </h3>
          <table className={frame["table"]}>
            <thead>
              <tr>
                <th scope="col">
                  <FormattedMessage {...nameColumn} />
                </th>
                <th scope="col">
                  <FormattedMessage {...classColumn} />
                </th>
                <th scope="col" data-align="end">
                  <FormattedMessage {...portionsColumn} />
                </th>
                <th scope="col" data-align="end">
                  <FormattedMessage {...priceColumn} />
                </th>
              </tr>
            </thead>
            <tbody>
              {total.bookings.length === 0 ? <NoBookingsRow columns={4} /> : null}
              {total.bookings.map((booking) => (
                <tr key={booking.id}>
                  <td>{booking.name}</td>
                  <td>{booking.className}</td>
                  <td data-align="end">{booking.portions}</td>
                  <td data-align="end">
                    {amountsText(bookingAmounts(total.dish, booking.portions))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <PrintTotal>
        {dotted(intl, [
          intl.formatMessage(portionCountMessage, { count: list.totals.portions }),
          amountsText(list.totals.amounts),
        ])}
      </PrintTotal>
    </>
  );
}

interface PrintListR2Props {
  /** Snapshot of the full state at the click (PLAN § 3.8). */
  list: ListR2;
  /** Document D, summary of tomorrow: « Ouvert par » only, no signature (07 § 7). */
  tomorrow: boolean;
  /** Time of the click, in ms. */
  printedAt: number;
}

/** Document B or D. On D the date is an `h2` above the `h3` of the dishes. */
export function PrintListR2({ list, tomorrow, printedAt }: PrintListR2Props) {
  const { day } = list;
  return (
    <PrintFrame
      accent="r2"
      printedAt={printedAt}
      heading={list.restaurantName}
      iso={list.iso}
      tomorrow={tomorrow}
      dateHeading={tomorrow}
      signature={!tomorrow}
      infos={
        tomorrow && day === undefined ? undefined : (
          <>
            {tomorrow || day === undefined || day.theme === "" ? null : (
              <PrintInfo
                label={
                  <FormattedMessage
                    id="print.r2.list.info.theme"
                    defaultMessage="Thème"
                    description="07 § 4 — information « Thème » de la liste R2"
                  />
                }
              >
                {day.theme}
              </PrintInfo>
            )}
            {tomorrow || day === undefined || day.note === "" ? null : (
              <PrintInfo
                label={
                  <FormattedMessage
                    id="print.r2.list.info.note"
                    defaultMessage="Note"
                    description="07 § 4 — information « Note » de la liste R2"
                  />
                }
              >
                {day.note}
              </PrintInfo>
            )}
            <OpenedByInfo openedBy={day?.openedBy ?? ""} />
          </>
        )
      }
    >
      {tomorrow ? <TomorrowBody list={list} /> : <ListBody list={list} />}
    </PrintFrame>
  );
}
