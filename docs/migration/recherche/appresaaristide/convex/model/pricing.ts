export interface Prices {
  priceEleve: number;
  priceProf: number;
  priceExterieur: number;
}

export interface R1Counts {
  nbEleve: number;
  nbProf: number;
  nbExt: number;
}

function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

export function r1Total(prices: Prices, counts: R1Counts): number {
  return roundCents(
    counts.nbEleve * prices.priceEleve +
      counts.nbProf * prices.priceProf +
      counts.nbExt * prices.priceExterieur,
  );
}

export interface R2Line {
  qty: number;
  unitPrice?: number | undefined;
}

/** Sum of priced lines; `hasPriceGap` is true when at least one line has no price. */
export function r2Total(lines: R2Line[]): {
  totalPrice: number;
  hasPriceGap: boolean;
} {
  let total = 0;
  let hasPriceGap = false;
  for (const line of lines) {
    if (line.unitPrice === undefined) hasPriceGap = true;
    else total += line.qty * line.unitPrice;
  }
  return { totalPrice: roundCents(total), hasPriceGap };
}

/** `4,95 €` */
export function formatEuro(n: number): string {
  return `${n.toFixed(2).replace(".", ",")} €`;
}
