import * as v from "valibot";
import { describe, expect, it } from "vitest";

import {
  DishSchema,
  EmailStatusSchema,
  PublicStateSchema,
  ReadResponseSchema,
  SettingsSchema,
  WriteResponseSchema,
} from "@/api/schemas";
import type { PublicState, WriteResponse } from "@/domain/types";
import bookingResultExample from "@/mocks/fixtures/add-booking-r2-multi-result.json" with { type: "json" };
import localCacheExample from "@/mocks/fixtures/local-cache-v1.json" with { type: "json" };
import publicStateExample from "@/mocks/fixtures/public-state.json" with { type: "json" };
import unchangedExample from "@/mocks/fixtures/unchanged.json" with { type: "json" };

// Answers of 02 § 3.2, § 3.3, § 4.4 and § 4.5 translated into the model of domain/types.ts (PLAN § 3.3.6).

const PUBLIC_STATE: PublicState = {
  etag: "Xq3v0Gk1bWq9u2yYc5n3tA",
  settings: {
    name1: "Restaurant Pédagogique",
    name2: "Aristide",
    desc1: "Table réservée par nombre de couverts, avec le menu du jour.",
    desc2: "Plats à emporter ou sur place, chacun avec son propre stock.",
    cancellationContact: "l'établissement",
    priceStudent: 4.95,
    priceStaff: 6.1,
    priceExternal: 9.9,
  },
  r1Days: [
    {
      date: "2026-10-05",
      capacity: 20,
      menu: "Velouté, suprême de volaille, tarte fine",
      theme: "Automne",
    },
  ],
  r1Booked: [{ date: "2026-10-05", seats: 12 }],
  r2Days: [{ date: "2026-10-06", note: "", theme: "Semaine italienne" }],
  dishes: [
    {
      id: "3f1c2a9e-…",
      date: "2026-10-06",
      name: "Lasagnes",
      stock: 15,
      price: 4.5,
      voucher: false,
    },
    { id: "8b7d0c11-…", date: "2026-10-06", name: "Bowl", stock: 10, price: null, voucher: true },
  ],
  r2Booked: [{ dishId: "3f1c2a9e-…", portions: 3 }],
};

const DISH = { ID: "d1", Date: "2026-10-06", Nom: "Lasagnes", Stock: 15, Prix: 4.5 };

describe("public state (02 § 3.2, § 3.3)", () => {
  it("translates the example of 02 § 3.2", () => {
    expect(v.parse(PublicStateSchema, publicStateExample)).toStrictEqual(PUBLIC_STATE);
  });

  it("reads a new state or { unchanged } (02 § 3.3)", () => {
    expect(v.parse(ReadResponseSchema, publicStateExample)).toStrictEqual({
      type: "state",
      state: PUBLIC_STATE,
    });
    expect(v.parse(ReadResponseSchema, unchangedExample)).toStrictEqual({
      type: "unchanged",
      etag: "Xq3v0Gk1bWq9u2yYc5n3tA",
    });
  });

  it("drops the keys the model does not know, such as a setting added by setConfigField", () => {
    const state = v.parse(PublicStateSchema, { ...publicStateExample, logo: "x", r1Bookings: [] });
    expect(Object.keys(state.settings)).toHaveLength(8);
    expect(state).not.toHaveProperty("logo");
  });

  it.each([
    ["an HTML page", "<!DOCTYPE html>"],
    ["{ error }", { error: "Erreur" }],
    ["a state without r2Items", { ...publicStateExample, r2Items: undefined }],
    ["a malformed date", { ...publicStateExample, r1Bookings: [{ Date: "5/10/2026", Qte: 1 }] }],
    [
      "a capacity that is not a number",
      { ...publicStateExample, r1Days: [{ Date: "2026-10-05", Capacite: "vingt" }] },
    ],
  ])("refuses %s", (_label, answer) => {
    expect(v.safeParse(ReadResponseSchema, answer).success).toBe(false);
  });
});

describe("cells of the sheet (01 § 1, § 2.5)", () => {
  it.each([
    ["a number", 4.5, 4.5],
    ["a numeric string", "4.50", 4.5],
    ["an empty cell", "", null],
    ["0, kept as 0", 0, 0],
    ["'0', kept as 0", "0", 0],
  ])("reads the price from %s", (_label, Prix, price) => {
    expect(v.parse(DishSchema, { ...DISH, Prix }).price).toBe(price);
  });

  it("reads the stock from a numeric string", () => {
    expect(v.parse(DishSchema, { ...DISH, Stock: " 12 " }).stock).toBe(12);
  });

  it.each([
    ["an empty stock", { Stock: "" }],
    ["a text stock", { Stock: "dix" }],
    ["no price", { Prix: undefined }],
  ])("accepts no dish with %s, except a missing price", (label, change) => {
    expect(v.safeParse(DishSchema, { ...DISH, ...change }).success).toBe(label === "no price");
  });

  it.each([
    ["Bowl (ticket restaurant)", undefined, "Bowl", true],
    ["Bowl (Ticket Restaurant)  ", undefined, "Bowl", true],
    ["Bowl", true, "Bowl", true],
    ["Bowl (ticket restaurant)", true, "Bowl", true],
    ["Bowl", undefined, "Bowl", false],
    ["Ticket restaurant offert", undefined, "Ticket restaurant offert", false],
  ])("reads %j with Ticket %j as %j, voucher %j (01 § 3.5)", (Nom, Ticket, name, voucher) => {
    const dish = v.parse(DishSchema, { ...DISH, Nom, ...(Ticket === undefined ? {} : { Ticket }) });
    expect({ name: dish.name, voucher: dish.voucher }).toStrictEqual({ name, voucher });
  });

  it("reads the dishes and settings of the local copy (03 § 1.1)", () => {
    expect(v.parse(v.array(DishSchema), localCacheExample.r2Items)).toStrictEqual([
      { id: "8b7d0c11-…", date: "2026-10-06", name: "Bowl", stock: 10, price: null, voucher: true },
    ]);
    expect(v.parse(SettingsSchema, localCacheExample.config)).toMatchObject({
      cancellationContact: "l'établissement",
      priceStudent: 4.95,
    });
  });

  it("reads prices typed as numbers in the sheet (01 § 2.1)", () => {
    const settings = v.parse(SettingsSchema, { ...localCacheExample.config, priceProf: 6.1 });
    expect(settings.priceStaff).toBe(6.1);
  });
});

describe("answers of the bookings (02 § 4.4, § 4.5, § 5.4)", () => {
  const response = (fields: object): WriteResponse =>
    v.parse(WriteResponseSchema, { ...publicStateExample, ...fields });

  it.each([
    [{ sent: true }, { sent: true, reason: null }],
    [
      { sent: false, reason: "no-email" },
      { sent: false, reason: "no-email" },
    ],
    [
      { sent: false, reason: "Quota dépassé" },
      { sent: false, reason: "Quota dépassé" },
    ],
  ])("moves _emailStatus %j beside the state (02 § 4.4)", (status, emailStatus) => {
    expect(response({ _emailStatus: status })).toStrictEqual({
      state: PUBLIC_STATE,
      duplicate: false,
      emailStatus,
      bookingResult: null,
    });
    expect(v.parse(EmailStatusSchema, status)).toStrictEqual(emailStatus);
  });

  it("reads a duplicate: no e-mail status, no result (02 § 5.3)", () => {
    expect(response({ _duplicate: true })).toStrictEqual({
      state: PUBLIC_STATE,
      duplicate: true,
      emailStatus: null,
      bookingResult: null,
    });
  });

  it("translates the answer of 02 § 4.5: confirmed, adjusted and skipped dishes", () => {
    expect(response(bookingResultExample)).toStrictEqual({
      state: PUBLIC_STATE,
      duplicate: false,
      emailStatus: { sent: true, reason: null },
      bookingResult: {
        confirmed: [
          { dishId: "3f1c2a9e-…", name: "Lasagnes", portions: 2, price: 4.5, voucher: false },
          { dishId: "8b7d0c11-…", name: "Bowl", portions: 1, price: null, voucher: true },
        ],
        adjusted: [{ name: "Lasagnes", requested: 3, granted: 2 }],
        skipped: [{ name: "Tiramisu" }],
      },
    });
  });

  it("reads an order with nothing confirmed: _emailStatus null (02 § 4.5)", () => {
    const answer = response({
      _bookingResult: { confirmed: [], adjusted: [], skipped: [{ nom: "Lasagnes" }], totalPrix: 0 },
      _emailStatus: null,
    });
    expect(answer.emailStatus).toBeNull();
    expect(answer.bookingResult).toStrictEqual({
      confirmed: [],
      adjusted: [],
      skipped: [{ name: "Lasagnes" }],
    });
  });

  it("keeps the _… fields out of the state that goes to the cache", () => {
    const { state } = response({ _duplicate: true, ...bookingResultExample });
    expect(JSON.stringify(state)).not.toMatch(
      /_duplicate|_emailStatus|_bookingResult|duplicate|emailStatus/u,
    );
  });
});
