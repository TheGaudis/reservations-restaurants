import { describe, expect, it } from "vitest";

import {
  bookingAmounts,
  bookingsForDayR1,
  bookingsForDish,
  dishTotals,
  listR1,
  listR2,
  ordersForDay,
  r1Totals,
  r2DayTotals,
} from "@/domain/print";
import type { OrderLine } from "@/domain/print";
import {
  bookingR1,
  bookingR2,
  dish,
  fullState,
  staffDayR1,
  staffDayR2,
} from "@/test/domain-states";

const TOMORROW = "2026-10-06";

describe("R1 lists (07 § 3, § 5, § 6)", () => {
  const state = fullState({
    r1Days: [staffDayR1(TOMORROW, 20, "M. Dupont")],
    r1Bookings: [
      bookingR1("b1", TOMORROW, {
        seats: 7,
        students: 5,
        staffMembers: 2,
        externals: 0,
        total: 36.95,
      }),
      bookingR1("other-day", "2026-10-05", { seats: 4 }),
      bookingR1("b2", TOMORROW, {
        seats: 5,
        students: 3,
        staffMembers: 1,
        externals: 1,
        total: 30.85,
      }),
    ],
  });

  it("keeps the order of the sheet, no sort (D-08)", () => {
    expect(bookingsForDayR1(state, TOMORROW).map((booking) => booking.id)).toStrictEqual([
      "b1",
      "b2",
    ]);
  });

  it("adds up « 12 couverts · 8 élèves, 3 personnels, 1 extérieur · 67,80 € » (07 § 3)", () => {
    expect(r1Totals(bookingsForDayR1(state, TOMORROW))).toStrictEqual({
      seats: 12,
      students: 8,
      staffMembers: 3,
      externals: 1,
      detailed: true,
      price: 67.8,
    });
  });

  it("leaves the detail out when a booking predates the prices", () => {
    const old = bookingR1("old", TOMORROW, {
      seats: 3,
      students: null,
      staffMembers: null,
      externals: null,
      total: null,
    });
    const totals = r1Totals([...bookingsForDayR1(state, TOMORROW), old]);
    expect(totals.seats).toBe(15);
    expect(totals.detailed).toBe(false);
    expect(totals.price).toBe(67.8);
  });

  it("totals an empty list", () => {
    expect(r1Totals([])).toStrictEqual({
      seats: 0,
      students: 0,
      staffMembers: 0,
      externals: 0,
      detailed: false,
      price: 0,
    });
  });

  it("takes the snapshot of a list: name, day, bookings of the day and totals (PLAN § 3.8)", () => {
    const list = listR1(state, TOMORROW);
    expect(list.restaurantName).toBe("Restaurant Pédagogique");
    expect(list.day).toStrictEqual(staffDayR1(TOMORROW, 20, "M. Dupont"));
    expect(list.bookings.map((booking) => booking.id)).toStrictEqual(["b1", "b2"]);
    expect(list.totals.seats).toBe(12);
  });

  it("has no day once the day is deleted (annexe F, print.r1.list.dayClosed)", () => {
    const list = listR1(state, "2026-10-07");
    expect(list.day).toBeUndefined();
    expect(list.bookings).toStrictEqual([]);
  });
});

describe("R2 lists (07 § 4, § 5, § 7)", () => {
  const lasagnes = dish("lasagnes", TOMORROW, { name: "Lasagnes", stock: 15, price: 4.5 });
  const bowl = dish("bowl", TOMORROW, { name: "Bowl", stock: 10, voucher: true });
  const wrap = dish("wrap", TOMORROW, { name: "Wrap", stock: 5, voucher: true });
  const salade = dish("salade", TOMORROW, { name: "Salade", stock: 5 });
  const otherDay = dish("other", "2026-10-05", { name: "Lasagnes" });
  const ariele = { name: "Ariele Gsell", className: "Vie scolaire", contact: "a.gsell@exemple.fr" };
  const state = fullState({
    dishes: [otherDay, lasagnes, bowl, wrap, salade],
    r2Bookings: [
      bookingR2("a1", "bowl", {
        ...ariele,
        portions: 2,
        serviceMode: "dineIn",
        observation: "sans sauce",
      }),
      bookingR2("n1", "lasagnes", { name: "Noah Bernard", className: "TS2", portions: 1 }),
      bookingR2("orphan", "deleted-dish", { name: "Paul Durand", className: "1A", portions: 2 }),
      bookingR2("a2", "wrap", {
        name: " ariele gsell ",
        className: "VIE SCOLAIRE",
        contact: "A.Gsell@exemple.fr ",
        portions: 1,
      }),
      bookingR2("e1", "lasagnes", {
        name: "Emma Roy",
        className: "TS2",
        portions: 1,
        serviceMode: "dineIn",
      }),
      bookingR2("l1", "salade", { name: "Élodie Petit", className: "TS2", portions: 1 }),
      bookingR2("x1", "other", { name: "Jean Petit", className: "1A", portions: 3 }),
      bookingR2("a3", "lasagnes", { ...ariele, contact: "06 12 34 56 78", portions: 1 }),
    ],
  });
  const orders = ordersForDay(state, TOMORROW);

  it("groups by name, class and contact, sorts by class then name, leaves the orphan out (07 § 4.1, D-07)", () => {
    expect(orders.map((order) => [order.className, order.name, order.contact])).toStrictEqual([
      ["TS2", "Élodie Petit", ""],
      ["TS2", "Emma Roy", ""],
      ["TS2", "Noah Bernard", ""],
      ["Vie scolaire", "Ariele Gsell", "a.gsell@exemple.fr"],
      ["Vie scolaire", "Ariele Gsell", "06 12 34 56 78"],
    ]);
  });

  it("keeps the lines, portions and modes of an order, one voucher at most (E-16)", () => {
    const order = orders[3];
    expect(order?.lines).toStrictEqual<OrderLine[]>([
      { bookingId: "a1", dish: bowl, portions: 2, observation: "sans sauce" },
      { bookingId: "a2", dish: wrap, portions: 1, observation: "" },
    ]);
    expect(order?.key).toBe("ariele gsell|vie scolaire|a.gsell@exemple.fr");
    expect(order?.portions).toBe(3);
    expect(order?.serviceModes).toStrictEqual(["dineIn", "takeaway"]);
    expect(order?.amounts).toStrictEqual({ euros: 0, vouchers: 1, gap: false });
    expect(orders[0]?.amounts).toStrictEqual({ euros: 0, vouchers: 0, gap: true });
  });

  it("totals the day: clients, portions, one voucher per order (07 § 4.2, E-16)", () => {
    expect(r2DayTotals(orders)).toStrictEqual({
      clients: 5,
      portions: 7,
      amounts: { euros: 13.5, vouchers: 1, gap: true },
    });
    expect(r2DayTotals([])).toStrictEqual({
      clients: 0,
      portions: 0,
      amounts: { euros: 0, vouchers: 0, gap: false },
    });
  });

  it("summarises each dish of the day in the order of the sheet (07 § 4.2, § 5)", () => {
    expect(dishTotals(state, TOMORROW, orders)).toStrictEqual([
      {
        dish: lasagnes,
        portions: 3,
        amounts: { euros: 13.5, vouchers: 0, gap: false },
        bookings: bookingsForDish(state, "lasagnes"),
      },
      {
        dish: bowl,
        portions: 2,
        amounts: { euros: 0, vouchers: 1, gap: false },
        bookings: bookingsForDish(state, "bowl"),
      },
      {
        dish: wrap,
        portions: 1,
        amounts: { euros: 0, vouchers: 1, gap: false },
        bookings: bookingsForDish(state, "wrap"),
      },
      {
        dish: salade,
        portions: 1,
        amounts: { euros: 0, vouchers: 0, gap: true },
        bookings: bookingsForDish(state, "salade"),
      },
    ]);
  });

  it("counts one voucher for a customer with 3 Bowl (REG-41)", () => {
    const three = fullState({
      dishes: [bowl],
      r2Bookings: [bookingR2("a", "bowl", { name: "Client A", portions: 3 })],
    });
    const threeOrders = ordersForDay(three, TOMORROW);
    expect(threeOrders[0]?.amounts.vouchers).toBe(1);
    expect(dishTotals(three, TOMORROW, threeOrders)[0]?.amounts.vouchers).toBe(1);
    expect(r2DayTotals(threeOrders).amounts.vouchers).toBe(1);
  });

  it("lists the bookings of a dish in the order of the sheet (07 § 7)", () => {
    expect(bookingsForDish(state, "lasagnes").map((booking) => booking.id)).toStrictEqual([
      "n1",
      "e1",
      "a3",
    ]);
    expect(bookingsForDish(state, "none")).toStrictEqual([]);
  });

  it("has no order on a day without booking", () => {
    expect(ordersForDay(state, "2026-10-07")).toStrictEqual([]);
  });

  it.each([
    [
      "a priced dish counts its portions in euros",
      lasagnes,
      3,
      { euros: 13.5, vouchers: 0, gap: false },
    ],
    ["a voucher dish counts one voucher (E-16)", bowl, 3, { euros: 0, vouchers: 1, gap: false }],
    ["a dish without price leaves a gap", salade, 1, { euros: 0, vouchers: 0, gap: true }],
  ])("prices a row of document D: %s (07 § 7)", (_case, rowDish, portions, amounts) => {
    expect(bookingAmounts(rowDish, portions)).toStrictEqual(amounts);
  });

  it("takes the snapshot of an R2 day: name, day, orders, dishes and total (PLAN § 3.8)", () => {
    const day = { ...staffDayR2(TOMORROW, "M. Dupont"), note: "Menu végétarien" };
    const list = listR2({ ...state, r2Days: [staffDayR2("2026-10-05"), day] }, TOMORROW);
    expect(list.iso).toBe(TOMORROW);
    expect(list.restaurantName).toBe("Aristide");
    expect(list.day).toStrictEqual(day);
    expect(list.orders).toStrictEqual(orders);
    expect(list.dishes).toStrictEqual(dishTotals(state, TOMORROW, orders));
    expect(list.totals).toStrictEqual(r2DayTotals(orders));
  });

  it("has no day when the R2 day is not open", () => {
    expect(listR2(state, TOMORROW).day).toBeUndefined();
  });
});
