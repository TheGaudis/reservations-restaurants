import { describe, expect, it } from "vitest";

import {
  addAmounts,
  hasAmounts,
  orderAmounts,
  priceR1,
  r2Amounts,
  seatTotal,
} from "@/domain/pricing";
import type { Amounts, DishLine, SeatCounts } from "@/domain/pricing";
import { SETTINGS } from "@/test/domain-states";

const lasagnes = { price: 4.5, voucher: false };
const bowl = { price: null, voucher: true };
const wrap = { price: null, voucher: true };
const salade = { price: null, voucher: false };
const free = { price: 0, voucher: false };

describe("R1 price (01 § 3.4, 04 § 5.2)", () => {
  it.each<[SeatCounts, number, number]>([
    [{ students: 0, staffMembers: 0, externals: 0 }, 0, 0],
    [{ students: 1, staffMembers: 0, externals: 0 }, 1, 4.95],
    [{ students: 2, staffMembers: 1, externals: 0 }, 3, 16],
    [{ students: 2, staffMembers: 1, externals: 1 }, 4, 25.9],
    [{ students: 0, staffMembers: 0, externals: 120 }, 120, 1188],
    [{ students: 3, staffMembers: 0, externals: 0 }, 3, 14.85],
  ])("%j: %i seats, %d €", (counts, seats, price) => {
    expect(seatTotal(counts)).toBe(seats);
    expect(priceR1(SETTINGS, counts)).toBe(price);
  });

  it("rounds to the cent", () => {
    expect(
      priceR1(
        { priceStudent: 0.1, priceStaff: 0.2, priceExternal: 0 },
        { students: 1, staffMembers: 1, externals: 0 },
      ),
    ).toBe(0.3);
  });
});

describe("R2 amounts (01 § 3.5, 04 § 5.3)", () => {
  it.each<[string, DishLine[], Amounts, Amounts]>([
    [
      "2 × Lasagnes",
      [{ dish: lasagnes, portions: 2 }],
      { euros: 9, vouchers: 0, gap: false },
      { euros: 9, vouchers: 0, gap: false },
    ],
    [
      "2 × Lasagnes + 3 × Bowl + 1 × Wrap",
      [
        { dish: lasagnes, portions: 2 },
        { dish: bowl, portions: 3 },
        { dish: wrap, portions: 1 },
      ],
      { euros: 9, vouchers: 4, gap: false },
      { euros: 9, vouchers: 1, gap: false },
    ],
    [
      "1 × Bowl",
      [{ dish: bowl, portions: 1 }],
      { euros: 0, vouchers: 1, gap: false },
      { euros: 0, vouchers: 1, gap: false },
    ],
    [
      "1 × Lasagnes + 1 × Salade without price",
      [
        { dish: lasagnes, portions: 1 },
        { dish: salade, portions: 1 },
      ],
      { euros: 4.5, vouchers: 0, gap: true },
      { euros: 4.5, vouchers: 0, gap: true },
    ],
    [
      "1 × Salade without price",
      [{ dish: salade, portions: 1 }],
      { euros: 0, vouchers: 0, gap: true },
      { euros: 0, vouchers: 0, gap: true },
    ],
    [
      "0 × Salade",
      [{ dish: salade, portions: 0 }],
      { euros: 0, vouchers: 0, gap: false },
      { euros: 0, vouchers: 0, gap: false },
    ],
    [
      "2 × a dish priced 0 (01 point 9)",
      [{ dish: free, portions: 2 }],
      { euros: 0, vouchers: 0, gap: false },
      { euros: 0, vouchers: 0, gap: false },
    ],
    ["nothing", [], { euros: 0, vouchers: 0, gap: false }, { euros: 0, vouchers: 0, gap: false }],
  ])("%s", (_case, lines, amounts, order) => {
    expect(r2Amounts(lines)).toStrictEqual(amounts);
    expect(orderAmounts(lines)).toStrictEqual(order);
  });

  it("rounds euros to the cent", () => {
    expect(r2Amounts([{ dish: { price: 0.1, voucher: false }, portions: 3 }]).euros).toBe(0.3);
  });

  it("adds up amounts", () => {
    expect(addAmounts([])).toStrictEqual({ euros: 0, vouchers: 0, gap: false });
    expect(
      addAmounts([
        { euros: 0.1, vouchers: 1, gap: false },
        { euros: 0.2, vouchers: 1, gap: true },
      ]),
    ).toStrictEqual({ euros: 0.3, vouchers: 2, gap: true });
  });

  it.each<[Amounts, boolean]>([
    [{ euros: 0, vouchers: 0, gap: true }, false],
    [{ euros: 0, vouchers: 1, gap: false }, true],
    [{ euros: 7, vouchers: 0, gap: false }, true],
  ])("%j has something to show: %s", (amounts, shown) => {
    expect(hasAmounts(amounts)).toBe(shown);
  });
});
