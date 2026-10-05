import { describe, expect, it } from "vitest";

import type { BookingR1, BookingR2, Dish } from "@/domain/types";
import { bookingLineR1, bookingLineR2, editResaValue } from "@/features/staff/booking-line";

// Booking lines of the staff cards (05 § 4.6): parts joined by « — », empty parts left out.

const R1: BookingR1 = {
  id: "b1",
  date: "2026-10-06",
  name: "Cyrille Ungerer",
  className: "TS2",
  contact: "c.ungerer@exemple.fr",
  seats: 3,
  students: 2,
  staffMembers: 1,
  externals: 0,
  total: 16,
  observation: "Table près de la fenêtre",
  timestamp: "2026-10-02",
};

const LASAGNES: Dish = {
  id: "d1",
  date: "2026-10-06",
  name: "Lasagnes",
  stock: 10,
  price: 3.5,
  voucher: false,
};

const R2: BookingR2 = {
  id: "b2",
  dishId: "d1",
  date: "2026-10-06",
  name: "Noah Bernard",
  className: "TS1",
  contact: "n.bernard@exemple.fr",
  portions: 2,
  serviceMode: "takeaway",
  observation: "",
  timestamp: "2026-10-02",
};

describe("bookingLineR1 (05 § 4.6)", () => {
  it.each([
    [
      "every part",
      R1,
      ["TS2", "3 couverts", "16,00 €", "c.ungerer@exemple.fr"],
      "Table près de la fenêtre",
    ],
    [
      "a total of 0 left out",
      { ...R1, total: 0 },
      ["TS2", "3 couverts", "c.ungerer@exemple.fr"],
      "Table près de la fenêtre",
    ],
    [
      "an empty total left out",
      { ...R1, total: null, observation: "" },
      ["TS2", "3 couverts", "c.ungerer@exemple.fr"],
      "",
    ],
    [
      "one seat, empty class and contact",
      { ...R1, seats: 1, className: "", contact: "" },
      ["1 couvert", "16,00 €"],
      "Table près de la fenêtre",
    ],
  ])("%s", (_case, booking, details, observation) => {
    expect(bookingLineR1(booking)).toStrictEqual({ name: booking.name, details, observation });
  });
});

describe("bookingLineR2 (05 § 4.6)", () => {
  it.each([
    [
      "priced dish, taken away",
      R2,
      LASAGNES,
      ["TS1", "2 portions", "7,00 €", "à emporter", "n.bernard@exemple.fr"],
    ],
    [
      "dish without a price, dine-in",
      { ...R2, portions: 1, serviceMode: "dineIn" as const },
      { ...LASAGNES, price: null },
      ["TS1", "1 portion", "sur place", "n.bernard@exemple.fr"],
    ],
    [
      "voucher dish",
      { ...R2, portions: 2 },
      { ...LASAGNES, price: null, voucher: true },
      ["TS1", "2 portions", "2 tickets restaurant", "à emporter", "n.bernard@exemple.fr"],
    ],
  ])("%s", (_case, booking, dish, details) => {
    expect(bookingLineR2(booking, dish).details).toStrictEqual(details);
  });
});

describe("editResaValue (PLAN § 3.2)", () => {
  it("writes {restaurant}:{id}", () => {
    expect(editResaValue("r1", "r1b-d+1-ungerer")).toBe("r1:r1b-d+1-ungerer");
    expect(editResaValue("r2", "abc")).toBe("r2:abc");
  });
});
