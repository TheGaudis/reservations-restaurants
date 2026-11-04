import { describe, expect, it } from "vitest";

import {
  bookingsOfDay,
  dishDraftStatus,
  isR2DayOpen,
  openDateProblem,
  openDayDishes,
} from "@/domain/days";
import { emptyDishDraft } from "@/domain/dishes";
import type { DishDraft } from "@/domain/dishes";
import {
  bookingR1,
  bookingR2,
  dish,
  fullState,
  staffDayR1,
  staffDayR2,
} from "@/test/domain-states";

const TODAY = "2026-10-05";

const draft = (overrides: Partial<DishDraft>): DishDraft => ({ ...emptyDishDraft(), ...overrides });

describe("dish drafts of « Ouvrir un jour » R2 (06 § 4.2, D-19)", () => {
  it.each<[string, Partial<DishDraft>, string]>([
    ["nothing typed", {}, "blank"],
    ["spaces only", { name: "  ", stock: " ", price: " " }, "blank"],
    ["voucher box alone", { voucher: true }, "blank"],
    ["name and stock", { name: "Bowl", stock: "10" }, "complete"],
    ["name, stock and price", { name: "Lasagnes", stock: "8", price: "4,5" }, "complete"],
    ["name without stock", { name: "Salade" }, "incomplete"],
    ["stock without name", { stock: "8" }, "incomplete"],
    ["stock 0", { name: "Salade", stock: "0" }, "incomplete"],
    ["stock cut to 0", { name: "Salade", stock: "0.5" }, "incomplete"],
    ["stock cut as parseInt", { name: "Salade", stock: "2.5" }, "complete"],
    ["price alone", { price: "3,50" }, "incomplete"],
  ])("%s: %j is %s", (_case, overrides, status) => {
    expect(dishDraftStatus(draft(overrides))).toBe(status);
  });

  it("sends the complete lines only, in their order", () => {
    expect(
      openDayDishes([
        draft({ name: "Bowl", stock: "10", voucher: true }),
        draft({}),
        draft({ name: "Salade" }),
        draft({ name: "Lasagnes", stock: "8", price: "4.5" }),
      ]),
    ).toStrictEqual([
      { name: "Bowl", stock: 10, price: null, voucher: true },
      { name: "Lasagnes", stock: 8, price: 4.5, voucher: false },
    ]);
  });
});

describe("date of « Ouvrir un jour » (D-19, E-36)", () => {
  const state = fullState({
    r1Days: [staffDayR1("2026-10-01", 20), staffDayR1("2026-10-06", 20)],
    r2Days: [staffDayR2("2026-10-06"), staffDayR2("2026-10-10")],
  });

  it.each<["r1" | "r2", string, ReturnType<typeof openDateProblem>]>([
    ["r1", "2026-10-02", "past"],
    ["r1", "2026-10-01", "past"],
    ["r1", "2026-10-06", "alreadyOpen"],
    ["r1", TODAY, null],
    ["r1", "2026-10-20", null],
    ["r2", "2026-10-02", "past"],
    // An open R2 day is a warning, not a refusal.
    ["r2", "2026-10-06", null],
    ["r2", "2026-10-20", null],
  ])("%s on %s: %s", (restaurant, date, problem) => {
    expect(openDateProblem(state, restaurant, date, TODAY)).toBe(problem);
  });

  it.each([
    ["2026-10-06", true],
    // Open without any dish: the script still knows the day.
    ["2026-10-10", true],
    ["2026-10-20", false],
  ])("R2 day %s already open: %s", (date, open) => {
    expect(isR2DayOpen(state, date)).toBe(open);
  });
});

describe("bookings taken away by the deletion of a day (D-21)", () => {
  const state = fullState({
    r1Bookings: [
      bookingR1("a", "2026-10-06"),
      bookingR1("b", "2026-10-06"),
      bookingR1("c", "2026-10-07"),
    ],
    dishes: [dish("bowl", "2026-10-06"), dish("wrap", "2026-10-06"), dish("tajine", "2026-10-07")],
    r2Bookings: [
      bookingR2("x", "bowl"),
      bookingR2("y", "wrap"),
      bookingR2("z", "wrap"),
      // Its dish was deleted (b-3): out of the lists, out of the count.
      bookingR2("orphan", "deleted-dish"),
      bookingR2("w", "tajine", { date: "2026-10-07" }),
    ],
  });

  it.each<["r1" | "r2", string, number]>([
    ["r1", "2026-10-06", 2],
    ["r1", "2026-10-07", 1],
    ["r1", "2026-10-08", 0],
    ["r2", "2026-10-06", 3],
    ["r2", "2026-10-07", 1],
    ["r2", "2026-10-08", 0],
  ])("%s on %s: %i", (restaurant, date, count) => {
    expect(bookingsOfDay(state, restaurant, date)).toBe(count);
  });
});
