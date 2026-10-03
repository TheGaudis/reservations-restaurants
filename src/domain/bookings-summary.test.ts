import { describe, expect, it } from "vitest";

import { bookingR1Input, summaryR1, summaryR2, wasAdjusted } from "@/domain/bookings";
import type { SummaryDish, SummaryWarning } from "@/domain/bookings";
import type {
  AdjustedDish,
  BookingResult,
  ConfirmedDish,
  OrderItem,
  OrderR2Input,
  SkippedDish,
  WriteResponse,
} from "@/domain/types";
import { TODAY } from "@/test/clock";
import { dish, publicState, SETTINGS } from "@/test/domain-states";

const lasagnes = dish("lasagnes", TODAY, { name: "Lasagnes", stock: 10, price: 4.5 });
const bowl = dish("bowl", TODAY, { name: "Bowl", stock: 10, voucher: true });
const state = publicState({ dishes: [lasagnes, bowl] });
const identity = {
  name: " Cyrille Ungerer ",
  contact: "c.ungerer@exemple.fr",
  className: "TS2",
  observation: "",
};
const target = { date: TODAY, requestId: "1b4e28ba-2fa1-11d2-883f-0016d3cca427" };

function response(overrides: Partial<WriteResponse> = {}): WriteResponse {
  return {
    state,
    duplicate: false,
    emailStatus: { sent: true, reason: null },
    bookingResult: null,
    ...overrides,
  };
}

describe("R1 summary (04 § 7)", () => {
  const input = bookingR1Input(target, { ...identity, students: 2, staffMembers: 1, externals: 0 });

  it("shows the counters typed and the price at the prices received", () => {
    const prices = { ...SETTINGS, priceStudent: 5 };
    expect(summaryR1(input, response({ state: { ...state, settings: prices } }))).toStrictEqual({
      restaurant: "r1",
      date: TODAY,
      duplicate: false,
      name: "Cyrille Ungerer",
      className: "TS2",
      counts: { students: 2, staffMembers: 1, externals: 0 },
      seats: 3,
      price: 16.1,
      warnings: [],
    });
  });

  it.each<[string, Partial<WriteResponse>, boolean, SummaryWarning[]]>([
    ["e-mail failed", { emailStatus: { sent: false, reason: "quota" } }, false, ["emailFailed"]],
    ["no e-mail address", { emailStatus: { sent: false, reason: "no-email" } }, false, []],
    ["duplicate, rebuilt from the form (D-16)", { duplicate: true, emailStatus: null }, true, []],
  ])("%s", (_case, overrides, duplicate, warnings) => {
    const summary = summaryR1(input, response(overrides));
    expect(summary.duplicate).toBe(duplicate);
    expect(summary.warnings).toStrictEqual(warnings);
    expect(summary.price).toBe(16);
  });
});

describe("R2 summary (04 § 7, E-14, D-16)", () => {
  const items: OrderItem[] = [
    { dishId: "lasagnes", portions: 3 },
    { dishId: "bowl", portions: 3 },
    { dishId: "wrap", portions: 1 },
  ];
  const input: OrderR2Input = {
    ...target,
    name: "Ariele Gsell",
    contact: "a.gsell@exemple.fr",
    className: "Vie scolaire",
    observation: "",
    serviceMode: "dineIn",
    items,
  };

  it("lists the portions granted and counts one voucher per order", () => {
    const result: BookingResult = {
      confirmed: [
        { dishId: "lasagnes", name: "Lasagnes", portions: 2, price: 4.5, voucher: false },
        { dishId: "bowl", name: "Bowl", portions: 3, price: null, voucher: true },
        { dishId: "wrap", name: "Wrap", portions: 1, price: null, voucher: true },
      ],
      adjusted: [{ name: "Lasagnes", requested: 3, granted: 2 }],
      skipped: [],
    };
    expect(summaryR2(input, response({ bookingResult: result }), [lasagnes, bowl])).toStrictEqual({
      restaurant: "r2",
      date: TODAY,
      duplicate: false,
      name: "Ariele Gsell",
      className: "Vie scolaire",
      serviceMode: "dineIn",
      dishes: [
        { name: "Lasagnes", portions: 2 },
        { name: "Bowl", portions: 3 },
        { name: "Wrap", portions: 1 },
      ],
      amounts: { euros: 9, vouchers: 1, gap: false },
      warnings: ["adjusted"],
    });
  });

  it("adds up both warnings (E-14)", () => {
    const result: BookingResult = {
      confirmed: [{ dishId: "bowl", name: "Bowl", portions: 1, price: null, voucher: true }],
      adjusted: [],
      skipped: [{ name: "Wrap" }],
    };
    const summary = summaryR2(
      input,
      response({ bookingResult: result, emailStatus: { sent: false, reason: "quota" } }),
      [],
    );
    expect(summary?.warnings).toStrictEqual(["adjusted", "emailFailed"]);
  });

  it("marks a dish without price (gap)", () => {
    const result: BookingResult = {
      confirmed: [
        { dishId: "lasagnes-13", name: "Lasagnes", portions: 1, price: 4.5, voucher: false },
        { dishId: "salade", name: "Salade", portions: 1, price: null, voucher: false },
      ],
      adjusted: [],
      skipped: [],
    };
    expect(summaryR2(input, response({ bookingResult: result }), [])?.amounts).toStrictEqual({
      euros: 4.5,
      vouchers: 0,
      gap: true,
    });
  });

  it("rebuilds a duplicate from the portions requested (D-16)", () => {
    const summary = summaryR2(input, response({ duplicate: true, emailStatus: null }), [
      lasagnes,
      bowl,
    ]);
    expect(summary?.duplicate).toBe(true);
    expect(summary?.dishes).toStrictEqual<SummaryDish[]>([
      { name: "Lasagnes", portions: 3 },
      { name: "Bowl", portions: 3 },
      { name: "", portions: 1 },
    ]);
    expect(summary?.amounts).toStrictEqual({ euros: 13.5, vouchers: 1, gap: true });
    expect(summary?.warnings).toStrictEqual([]);
  });

  it("has no summary when nothing was confirmed (04 § 6.3)", () => {
    const empty: BookingResult = { confirmed: [], adjusted: [], skipped: [{ name: "Lasagnes" }] };
    expect(
      summaryR2(input, response({ bookingResult: empty, emailStatus: null }), [lasagnes]),
    ).toBeNull();
  });

  it.each<[AdjustedDish[], SkippedDish[], boolean]>([
    [[], [], false],
    [[{ name: "Lasagnes", requested: 3, granted: 2 }], [], true],
    [[], [{ name: "Tiramisu" }], true],
  ])("adjusted %j, skipped %j: warns %s (04 § 7)", (adjusted, skipped, warns) => {
    const confirmed: ConfirmedDish[] = [
      { dishId: "lasagnes", name: "Lasagnes", portions: 2, price: 4.5, voucher: false },
    ];
    expect(wasAdjusted({ confirmed, adjusted, skipped })).toBe(warns);
  });
});
