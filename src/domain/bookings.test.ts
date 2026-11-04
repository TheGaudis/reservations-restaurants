import { describe, expect, it } from "vitest";

import {
  bookingR1Input,
  editBookingR1Input,
  editBookingR2Input,
  emailFailed,
  maxPortionsForEdit,
  maxSeatsForEdit,
  orderOutcome,
  orderR2Input,
} from "@/domain/bookings";
import type { BookingR1Values, OrderR2Values, SeatCountValues } from "@/domain/bookings";
import type { BookingResult, EmailStatus, WriteResponse } from "@/domain/types";
import { TODAY } from "@/test/clock";
import { bookingR1, bookingR2, dayR1, dish, publicState, SETTINGS } from "@/test/domain-states";

const lasagnes = dish("lasagnes", TODAY, { name: "Lasagnes", stock: 10, price: 4.5 });
const bowl = dish("bowl", TODAY, { name: "Bowl", stock: 10, voucher: true });
const wrap = dish("wrap", TODAY, { name: "Wrap", stock: 5, voucher: true });
const salade = dish("salade", "2026-10-13", { name: "Salade", stock: 5 });
const lasagnes13 = dish("lasagnes-13", "2026-10-13", { name: "Lasagnes", stock: 2, price: 4.5 });
const state = publicState({
  r1Days: [
    dayR1("2026-10-01", 20),
    dayR1(TODAY, 20),
    dayR1("2026-10-09", 10),
    dayR1("2026-10-12", 5),
  ],
  r1Booked: [
    { date: TODAY, seats: 8 },
    { date: "2026-10-09", seats: 10 },
    { date: "2026-10-12", seats: 7 },
  ],
  r2Days: [TODAY, "2026-10-11", "2026-10-13", "2026-10-10"].map((date) => ({
    date,
    note: "",
    theme: "",
  })),
  dishes: [lasagnes, bowl, wrap, dish("tarte", "2026-10-11", { stock: 3 }), salade, lasagnes13],
  r2Booked: [
    { dishId: "lasagnes", portions: 6 },
    { dishId: "tarte", portions: 3 },
    { dishId: "lasagnes-13", portions: 2 },
  ],
});

const identity = {
  name: " Cyrille Ungerer ",
  contact: " c.ungerer@exemple.fr ",
  className: "TS2 ",
  observation: "  ",
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

describe("inputs of the booking actions (02 § 4.4, § 4.5, 04 § 6.2)", () => {
  it("trims the texts and sends empty counters as 0", () => {
    const seatCounts: SeatCountValues = { students: 2, staffMembers: 1, externals: null };
    const values: BookingR1Values = { ...identity, ...seatCounts };
    expect(bookingR1Input(target, values)).toStrictEqual({
      date: TODAY,
      requestId: target.requestId,
      name: "Cyrille Ungerer",
      contact: "c.ungerer@exemple.fr",
      className: "TS2",
      observation: "",
      students: 2,
      staffMembers: 1,
      externals: 0,
    });
  });

  it("sends the dishes with portions, in the order of the sheet, dine-in on a voucher day", () => {
    const values: OrderR2Values = {
      ...identity,
      serviceMode: "takeaway",
      portions: { wrap: 1, lasagnes: 2, bowl: 0, other: 4 },
    };
    expect(orderR2Input(target, values, [lasagnes, bowl, wrap])).toStrictEqual({
      date: TODAY,
      requestId: target.requestId,
      name: "Cyrille Ungerer",
      contact: "c.ungerer@exemple.fr",
      className: "TS2",
      observation: "",
      serviceMode: "dineIn",
      items: [
        { dishId: "lasagnes", portions: 2 },
        { dishId: "wrap", portions: 1 },
      ],
    });
  });

  it("keeps the chosen mode on a day without voucher", () => {
    const values: OrderR2Values = {
      ...identity,
      serviceMode: "takeaway",
      portions: { salade: null, "lasagnes-13": 1 },
    };
    const input = orderR2Input({ ...target, date: "2026-10-13" }, values, [salade, lasagnes13]);
    expect(input.serviceMode).toBe("takeaway");
    expect(input.items).toStrictEqual([{ dishId: "lasagnes-13", portions: 1 }]);
  });
});

describe("staff edits (06 § 7.3, § 7.4, D-19)", () => {
  it.each([
    ["seats left plus its own", bookingR1("b1", TODAY, { seats: 3 }), 15],
    ["its own seats when the day is full", bookingR1("b2", "2026-10-09", { seats: 4 }), 4],
    ["its own seats when the capacity was lowered", bookingR1("b3", "2026-10-12", { seats: 7 }), 7],
    ["its own seats when the day no longer exists", bookingR1("b4", "2026-10-07", { seats: 2 }), 2],
  ])("R1 maximum: %s", (_case, booking, max) => {
    expect(maxSeatsForEdit(state, booking)).toBe(max);
  });

  it.each([
    ["stock left plus its own", bookingR2("b1", "lasagnes", { portions: 2 }), 6],
    ["its own portions when sold out", bookingR2("b2", "tarte", { portions: 3 }), 3],
    ["its own portions when the dish was deleted", bookingR2("b3", "deleted", { portions: 2 }), 2],
  ])("R2 maximum: %s", (_case, booking, max) => {
    expect(maxPortionsForEdit(state, booking)).toBe(max);
  });

  it("sends seats and the price rounded to the cent (06 § 7.3)", () => {
    const values: BookingR1Values = { ...identity, students: 2, staffMembers: null, externals: 1 };
    expect(editBookingR1Input("b1", values, SETTINGS)).toStrictEqual({
      id: "b1",
      name: "Cyrille Ungerer",
      contact: "c.ungerer@exemple.fr",
      className: "TS2",
      observation: "",
      students: 2,
      staffMembers: 0,
      externals: 1,
      seats: 3,
      total: 19.8,
    });
  });

  it("trims the texts of an R2 edit", () => {
    expect(
      editBookingR2Input("b9", { ...identity, portions: 2, serviceMode: "dineIn" }),
    ).toStrictEqual({
      id: "b9",
      name: "Cyrille Ungerer",
      contact: "c.ungerer@exemple.fr",
      className: "TS2",
      observation: "",
      portions: 2,
      serviceMode: "dineIn",
    });
  });
});

describe("reading the answer (04 § 6.3, § 7)", () => {
  it.each<[EmailStatus | null, boolean]>([
    [{ sent: true, reason: null }, false],
    [{ sent: false, reason: "no-email" }, false],
    [{ sent: false, reason: "Service invoked too many times for one day: email." }, true],
    [null, false],
  ])("e-mail status %j: failed %s", (status, failed) => {
    expect(emailFailed(status)).toBe(failed);
  });

  const confirmed: BookingResult = {
    confirmed: [{ dishId: "lasagnes", name: "Lasagnes", portions: 2, price: 4.5, voucher: false }],
    adjusted: [],
    skipped: [],
  };

  it.each<[string, Partial<WriteResponse>, string]>([
    ["duplicate", { duplicate: true }, "duplicate"],
    [
      "nothing confirmed",
      { bookingResult: { confirmed: [], adjusted: [], skipped: [{ name: "Tiramisu" }] } },
      "nothingConfirmed",
    ],
    ["no booking result", {}, "nothingConfirmed"],
    ["confirmed", { bookingResult: confirmed }, "confirmed"],
  ])("%s", (_case, overrides, outcome) => {
    expect(orderOutcome(response(overrides))).toBe(outcome);
  });
});
