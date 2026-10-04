import { describe, expect, it } from "vitest";

import {
  capacityClass,
  dayStatusR1,
  dayStatusR2,
  dishesForDay,
  findDay,
  portionsBooked,
  portionsBookedForDay,
  remainingSeats,
  remainingStock,
  seatsBooked,
} from "@/domain/capacity";
import type { CapacityClass } from "@/domain/capacity";
import { dayR1, dish, fullState, publicState, staffDayR1, staffDayR2 } from "@/test/domain-states";

const lasagnes = dish("lasagnes", "2026-10-05", { stock: 10, price: 4.5 });
const bowl = dish("bowl", "2026-10-05", { stock: 10, voucher: true });
const salade = dish("salade", "2026-10-06", { stock: 5 });
const state = publicState({
  r1Days: [dayR1("2026-10-05", 20), dayR1("2026-10-09", 10), dayR1("2026-10-12", 5)],
  r1Booked: [
    { date: "2026-10-05", seats: 8 },
    { date: "2026-10-09", seats: 10 },
    { date: "2026-10-12", seats: 7 },
  ],
  r2Days: [
    { date: "2026-10-05", note: "", theme: "" },
    { date: "2026-10-10", note: "", theme: "" },
  ],
  dishes: [lasagnes, bowl, salade],
  r2Booked: [
    { dishId: "lasagnes", portions: 6 },
    { dishId: "salade", portions: 7 },
    { dishId: "deleted-dish", portions: 2 },
  ],
});

describe("seats left (01 § 3.1)", () => {
  it.each([
    ["2026-10-05", 20, 8, 12],
    ["2026-10-09", 10, 10, 0],
    ["2026-10-12", 5, 7, -2],
  ])(
    "on %s: capacity %i, %i booked, %i left (negative included)",
    (iso, capacity, booked, left) => {
      const day = findDay(state.r1Days, iso);
      expect(day?.capacity).toBe(capacity);
      expect(seatsBooked(state, iso)).toBe(booked);
      expect(day === undefined ? null : remainingSeats(state, day)).toBe(left);
    },
  );

  it("adds up several totals of the same date and counts 0 on a day without booking", () => {
    const split = publicState({
      r1Days: [dayR1("2026-10-05", 20), dayR1("2026-10-06", 20)],
      r1Booked: [
        { date: "2026-10-05", seats: 3 },
        { date: "2026-10-05", seats: 4 },
      ],
    });
    expect(remainingSeats(split, dayR1("2026-10-05", 20))).toBe(13);
    expect(remainingSeats(split, dayR1("2026-10-06", 20))).toBe(20);
  });

  it("finds a day only when it is open", () => {
    expect(findDay(state.r1Days, "2026-10-07")).toBeUndefined();
    const staff = fullState({ r1Days: [staffDayR1("2026-10-05", 20, "M. Dupont")] });
    expect(findDay(staff.r1Days, "2026-10-05")?.openedBy).toBe("M. Dupont");
  });
});

describe("portions left (01 § 3.2)", () => {
  it.each([
    [lasagnes, 6, 4],
    [bowl, 0, 10],
    [salade, 7, -2],
  ])("$name: %i booked", (item, booked, left) => {
    expect(portionsBooked(state, item.id)).toBe(booked);
    expect(remainingStock(state, item)).toBe(left);
  });

  it("lists the dishes of a day in the order of the sheet", () => {
    expect(dishesForDay(state, "2026-10-05")).toStrictEqual([lasagnes, bowl]);
    expect(dishesForDay(state, "2026-10-10")).toStrictEqual([]);
  });

  it("leaves the bookings of a deleted dish out of the day total (D-07, b-3)", () => {
    expect(portionsBookedForDay(state, "2026-10-05")).toBe(6);
    expect(portionsBookedForDay(state, "2026-10-06")).toBe(7);
    expect(portionsBookedForDay(state, "2026-10-07")).toBe(0);
  });
});

describe("capacity class (01 § 3.3)", () => {
  const expected = (left: number): CapacityClass => {
    if (left <= 0) return "full";
    return left <= 9 ? "almostFull" : "available";
  };
  const rows = Array.from({ length: 23 }, (_, i) => 20 - i).map(
    (left) => [left, expected(left)] as const,
  );

  it.each(rows)("capacity 20, %i left: %s", (left, cls) => {
    expect(capacityClass(left, 20)).toBe(cls);
  });

  it.each([
    [10, 10, "available"],
    [5, 10, "available"],
    [4, 10, "almostFull"],
    [1, 1, "available"],
    [0, 1, "full"],
    [3, 0, "available"],
  ] as const)("%i left of %i: %s", (left, capacity, cls) => {
    expect(capacityClass(left, capacity)).toBe(cls);
  });
});

describe("day status (05 § 2.4)", () => {
  it.each([
    ["2026-10-05", "available"],
    ["2026-10-09", "full"],
    ["2026-10-12", "full"],
    ["2026-10-06", null],
  ])("R1 on %s: %s", (iso, status) => {
    expect(dayStatusR1(state, iso)).toBe(status);
  });

  it.each([
    ["2026-10-05", "available", "14 of 20 portions left, although the lasagnes are almost gone"],
    ["2026-10-06", null, "dishes without an R2 day"],
    ["2026-10-10", null, "an R2 day without dish"],
    ["2026-10-11", null, "no R2 day"],
  ])("R2 on %s: %s (%s)", (iso, status, _why) => {
    expect(dayStatusR2(state, iso)).toBe(status);
  });

  it.each([
    [[6, 5], "almostFull"],
    [[10, 10], "full"],
    [[11, 0], "almostFull"],
    [[12, 9], "full"],
    [[0, 0], "available"],
  ])("R2 aggregates the stocks of the day: %j booked of 10 + 10", (booked, status) => {
    const day = publicState({
      r2Days: [{ date: "2026-10-05", note: "", theme: "" }],
      dishes: [lasagnes, bowl],
      r2Booked: [
        { dishId: "lasagnes", portions: booked[0] ?? 0 },
        { dishId: "bowl", portions: booked[1] ?? 0 },
      ],
    });
    expect(dayStatusR2(day, "2026-10-05")).toBe(status);
  });

  it("reads the full state the same way", () => {
    const staff = fullState({
      r1Days: [staffDayR1("2026-10-05", 20, "M. Dupont")],
      r1Booked: [{ date: "2026-10-05", seats: 15 }],
      r2Days: [staffDayR2("2026-10-05")],
      dishes: [lasagnes],
      r2Booked: [{ dishId: "lasagnes", portions: 10 }],
    });
    expect(dayStatusR1(staff, "2026-10-05")).toBe("almostFull");
    expect(dayStatusR2(staff, "2026-10-05")).toBe("full");
  });

  it("reads a replaced state afresh", () => {
    const before = publicState({ r1Days: [dayR1("2026-10-05", 20)], r1Booked: [] });
    expect(dayStatusR1(before, "2026-10-05")).toBe("available");
    const after = { ...before, r1Booked: [{ date: "2026-10-05", seats: 20 }] };
    expect(dayStatusR1(after, "2026-10-05")).toBe("full");
    expect(dayStatusR1(before, "2026-10-05")).toBe("available");
  });
});
