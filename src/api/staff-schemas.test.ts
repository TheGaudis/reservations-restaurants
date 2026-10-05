import * as v from "valibot";
import { describe, expect, it } from "vitest";

import { BookingR1Schema, BookingR2Schema, FullStateSchema } from "@/api/staff-schemas";
import type { FullState } from "@/domain/types";
import fullStateExample from "@/mocks/fixtures/full-state.json" with { type: "json" };

// Full state of the staff mode (02 § 4.3) translated into the model of domain/types.ts (PLAN § 3.3.6).

const FULL_STATE: FullState = {
  settings: {
    name1: "…",
    name2: "…",
    desc1: "…",
    desc2: "…",
    cancellationContact: "…",
    priceStudent: 4.95,
    priceStaff: 6.1,
    priceExternal: 9.9,
  },
  r1Days: [{ date: "2026-10-05", capacity: 20, menu: "…", theme: "", openedBy: "M. Dupont" }],
  r1Bookings: [
    {
      id: "c0a8…",
      date: "2026-10-05",
      name: "Cyrille Ungerer",
      className: "TS2",
      contact: "c.ungerer@exemple.fr",
      seats: 3,
      students: 2,
      staffMembers: 1,
      externals: 0,
      total: 16,
      observation: "",
      timestamp: "2026-10-01",
    },
  ],
  r2Days: [{ date: "2026-10-06", note: "", theme: "", openedBy: "" }],
  dishes: [
    { id: "3f1c…", date: "2026-10-06", name: "Lasagnes", stock: 15, price: 4.5, voucher: false },
  ],
  r2Bookings: [
    {
      id: "77aa…",
      dishId: "3f1c…",
      date: "2026-10-06",
      name: "Ariele Gsell",
      className: "Vie scolaire",
      contact: "a.gsell@exemple.fr",
      portions: 2,
      serviceMode: "dineIn",
      observation: "",
      timestamp: "2026-10-02",
    },
  ],
  r1Booked: [{ date: "2026-10-05", seats: 3 }],
  r2Booked: [{ dishId: "3f1c…", portions: 2 }],
};

// Rows of the example of 02 § 4.3.
const R1_BOOKING = {
  ID: "c0a8…",
  Date: "2026-10-05",
  Nom: "Cyrille Ungerer",
  Contact: "c.ungerer@exemple.fr",
  Classe: "TS2",
  Qte: 3,
  Timestamp: "2026-10-01",
  Observation: "",
  NbEleve: 2,
  NbProf: 1,
  NbExt: 0,
  PrixTotal: 16,
};
const R2_BOOKING = {
  ID: "77aa…",
  ItemID: "3f1c…",
  Date: "2026-10-06",
  Nom: "Ariele Gsell",
  Contact: "a.gsell@exemple.fr",
  Classe: "Vie scolaire",
  Qte: 2,
  Mode: "surplace",
  Timestamp: "2026-10-02",
  Observation: "",
};

describe("full state (02 § 4.3)", () => {
  it("translates the example of 02 § 4.3, without etag", () => {
    expect(fullStateExample.r1Bookings).toStrictEqual([R1_BOOKING]);
    expect(fullStateExample.r2Bookings).toStrictEqual([R2_BOOKING]);
    expect(v.parse(FullStateSchema, fullStateExample)).toStrictEqual(FULL_STATE);
  });

  it("sums the seats per date and the portions per dish, in order of first appearance (01 § 2.3, § 2.6)", () => {
    const state = v.parse(FullStateSchema, {
      ...fullStateExample,
      r1Bookings: [
        { ...R1_BOOKING, ID: "a", Date: "2026-10-06", Qte: 2 },
        { ...R1_BOOKING, ID: "b", Date: "2026-10-05", Qte: "4" },
        { ...R1_BOOKING, ID: "c", Date: "2026-10-06", Qte: 5 },
      ],
      r2Bookings: [
        { ...R2_BOOKING, ID: "d", ItemID: "x", Qte: 1 },
        { ...R2_BOOKING, ID: "e", ItemID: "orphan", Qte: 3 },
        { ...R2_BOOKING, ID: "f", ItemID: "x", Qte: 2 },
      ],
    });
    expect(state.r1Booked).toStrictEqual([
      { date: "2026-10-06", seats: 7 },
      { date: "2026-10-05", seats: 4 },
    ]);
    expect(state.r2Booked).toStrictEqual([
      { dishId: "x", portions: 3 },
      { dishId: "orphan", portions: 3 },
    ]);
  });

  it("reads an empty sheet", () => {
    const state = v.parse(FullStateSchema, {
      ...fullStateExample,
      r1Days: [],
      r1Bookings: [],
      r2Days: [],
      r2Items: [],
      r2Bookings: [],
    });
    expect([state.r1Booked, state.r2Booked]).toStrictEqual([[], []]);
  });
});

describe("bookings of the full state (01 § 2.3, § 2.6)", () => {
  it("reads empty counters and total of an old R1 booking as null, never 0", () => {
    const booking = v.parse(BookingR1Schema, {
      ...R1_BOOKING,
      NbEleve: "",
      NbProf: "",
      NbExt: "",
      PrixTotal: "",
    });
    expect(booking).toMatchObject({
      students: null,
      staffMembers: null,
      externals: null,
      total: null,
    });
  });

  it("reads the columns missing from an old sheet as empty (01 § 1)", () => {
    const { ID, Date, Nom, Contact, Classe, Qte, Timestamp } = R1_BOOKING;
    const booking = v.parse(BookingR1Schema, { ID, Date, Nom, Contact, Classe, Qte, Timestamp });
    expect(booking).toMatchObject({ observation: "", students: null, total: null });
  });

  it.each([
    ["emporter", "takeaway"],
    ["surplace", "dineIn"],
    ["", "dineIn"],
    ["sur place", "dineIn"],
  ])("reads the mode %j as %j (07 § 4.1)", (Mode, serviceMode) => {
    expect(v.parse(BookingR2Schema, { ...R2_BOOKING, Mode }).serviceMode).toBe(serviceMode);
  });

  it("refuses a booking without seats", () => {
    expect(v.safeParse(BookingR1Schema, { ...R1_BOOKING, Qte: "" }).success).toBe(false);
  });
});
