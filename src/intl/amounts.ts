// Texts of amounts (01 § 3.5, 04 § 5.2, § 5.3, § 7, § 8). `domain/pricing.ts` computes the numbers; the euro
// format comes from `Intl` (U+00A0 before €, E-20): never write a space around an amount by hand.
import { defineMessages } from "react-intl";

import { hasAmounts, r2Amounts } from "@/domain/pricing";
import type { Amounts, DishLine } from "@/domain/pricing";
import { intl } from "@/intl/intl";

// Value types of each message: react-intl types `formatMessage` from them (a descriptor without them takes no value).
const messages = defineMessages<{
  seats: { count: number };
  vouchers: { count: number };
  euroAndVouchers: { euros: string; vouchers: string };
  voucherPrice: Record<string, never>;
  withPrice: { label: string; price: string };
  r1Total: { seats: number; total: string };
  r2Total: { amounts: string };
  r2TotalWithGap: { amounts: string };
  summaryR1Total: { seats: string; total: string };
  summaryR2TotalWithGap: { amounts: string };
}>({
  seats: {
    id: "common.amount.seats",
    defaultMessage: "{count, plural, one {# couvert} other {# couverts}}",
    description: "00 § 3 (plural), 04 § 8 — nombre de couverts : 0 et 1 au singulier",
  },
  vouchers: {
    id: "common.amount.vouchers",
    defaultMessage: "{count, plural, one {# ticket restaurant} other {# tickets restaurant}}",
    description: "04 § 8 (ticketsText) — nombre de tickets restaurant",
  },
  euroAndVouchers: {
    id: "common.amount.euroAndVouchers",
    defaultMessage: "{euros} + {vouchers}",
    description:
      "01 § 3.5, 04 § 8 (amountsText) — montant en euros et tickets restaurant (« 9,00 € + 1 ticket restaurant »)",
  },
  voucherPrice: {
    id: "common.amount.voucherPrice",
    defaultMessage: "prix d'un ticket restaurant",
    description: "00 § 2.3, 01 § 3.5 (itemPriceText) — prix affiché d'un plat au ticket restaurant",
  },
  withPrice: {
    id: "common.amount.withPrice",
    defaultMessage: "{label} — {price}",
    description:
      "00 § 3 (dash), 04 § 8 — séparateur insécable entre un libellé et son prix (« Lasagnes — 4,50 € »)",
  },
  r1Total: {
    id: "public.r1.form.total",
    defaultMessage: "{seats, plural, one {# couvert} other {# couverts}} · Total : {total}",
    description: "04 § 5.2 — total en direct du formulaire R1 (« 3 couverts · Total : 16,00 € »)",
  },
  r2Total: {
    id: "public.r2.form.total",
    defaultMessage: "Total : {amounts}",
    description:
      "04 § 5.3 — total en direct du formulaire R2 (« Total : 9,00 € + 1 ticket restaurant »)",
  },
  r2TotalWithGap: {
    id: "public.r2.form.totalWithGap",
    defaultMessage: "Total (hors plats sans prix indiqué) : {amounts}",
    description: "04 § 5.3, D-03 — total en direct du formulaire R2 avec un plat sans prix",
  },
  summaryR1Total: {
    id: "public.summary.r1.total",
    defaultMessage: "{seats} — {total}",
    description: "04 § 7 — total du récapitulatif R1 (« 3 couverts — 16,00 € », espaces normales)",
  },
  summaryR2TotalWithGap: {
    id: "public.summary.r2.totalWithGap",
    defaultMessage: "{amounts} (hors plats sans prix indiqué)",
    description: "04 § 7, D-03, E-28 — total du récapitulatif R2 avec un plat sans prix",
  },
});

/** « 12,50 € » (`formatEuro`, 00 § 3): `'4.95'`, a price of the settings as the script sends it, is accepted. */
export function formatEuros(value: number | string): string {
  return intl.formatNumber(Number(value), { format: "euro" });
}

/**
 * « 0 couvert », « 1 couvert », « 2 couverts » (00 § 3).
 */
export function seatsText(count: number): string {
  return intl.formatMessage(messages.seats, { count });
}

/**
 * « 1 ticket restaurant », « 2 tickets restaurant » (`ticketsText`, 04 § 8).
 * @internal exported for its tests only (knip --production)
 */
export function vouchersText(count: number): string {
  return intl.formatMessage(messages.vouchers, { count });
}

/**
 * `amountsText` (01 § 3.5): « 12,00 € + 1 ticket restaurant », « 1 ticket restaurant », « 7,00 € » or empty.
 */
export function amountsText(amounts: Amounts): string {
  const euros = amounts.euros > 0 ? formatEuros(amounts.euros) : "";
  const vouchers = amounts.vouchers > 0 ? vouchersText(amounts.vouchers) : "";
  if (euros === "" || vouchers === "") return euros || vouchers;
  return intl.formatMessage(messages.euroAndVouchers, { euros, vouchers });
}

/** `itemPriceText` (01 § 3.5): « prix d'un ticket restaurant », « 3,50 € », or empty without a price or for 0. */
export function dishPriceText(dish: DishLine["dish"]): string {
  if (dish.voucher) return intl.formatMessage(messages.voucherPrice);
  return dish.price === null || dish.price === 0 ? "" : formatEuros(dish.price);
}

/**
 * `itemAmountText` (01 § 3.5): amount of `portions` portions of one dish (« 7,00 € », « 2 tickets restaurant »).
 */
export function dishAmountText(dish: DishLine["dish"], portions: number): string {
  return amountsText(r2Amounts([{ dish, portions }]));
}

/** `{label}{dash(price)}` (00 § 3): « Lasagnes␣— 4,50 € », or the label alone without a price. */
export function withPrice(label: string, price: string): string {
  return price === "" ? label : intl.formatMessage(messages.withPrice, { label, price });
}

/** Live total of the R1 form (04 § 5.2): « 3 couverts · Total : 16,00 € », « 0 couvert · Total : 0,00 € ». */
export function r1TotalText(seats: number, price: number): string {
  return intl.formatMessage(messages.r1Total, { seats, total: formatEuros(price) });
}

/** Live total of the R2 form (04 § 5.3, D-03): empty when nothing priced is chosen. */
export function r2TotalText(amounts: Amounts): string {
  if (!hasAmounts(amounts)) return "";
  const values = { amounts: amountsText(amounts) };
  return intl.formatMessage(amounts.gap ? messages.r2TotalWithGap : messages.r2Total, values);
}

/** Total line of the R1 summary (04 § 7): « 3 couverts — 16,00 € », the seats alone at 0 €. */
export function summaryR1TotalText(seats: number, price: number): string {
  if (price <= 0) return seatsText(seats);
  return intl.formatMessage(messages.summaryR1Total, {
    seats: seatsText(seats),
    total: formatEuros(price),
  });
}

/** Total line of the R2 summary (04 § 7, D-03, E-28): empty when nothing priced was confirmed. */
export function summaryR2TotalText(amounts: Amounts): string {
  if (!hasAmounts(amounts)) return "";
  const text = amountsText(amounts);
  return amounts.gap ? intl.formatMessage(messages.summaryR2TotalWithGap, { amounts: text }) : text;
}
