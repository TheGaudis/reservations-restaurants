import { describe, expect, it } from "vitest";

import {
  addDayR1,
  addDayR2,
  addItemR2,
  deleteBookingR1,
  deleteBookingR2,
  deleteDayR1,
  deleteDayR2,
  deleteItemR2,
  editBookingR1,
  editBookingR2,
  editDayR1,
  editItemR2,
  setConfigField,
} from "@/api/actions";
import { PasswordRejectedError } from "@/api/errors";
import type { FullState } from "@/domain/types";
import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { fakeScriptPerTest } from "@/test/fake-script-server";

// Bodies of the staff actions (02 § 4.7, 06 § 10), read in the fake script's requests: those of `STAFF_BODIES`
// (src/mocks/staff.test.ts), which the fake script accepts, with the password first.

const start = fakeScriptPerTest();
const PASSWORD = SEED_PASSWORD;

interface StaffCase {
  action: string;
  write: () => Promise<FullState>;
  body: Record<string, unknown>;
}

// Inputs of the English model and the bodies of 02 § 4.7 they must produce (`STAFF_BODIES` of the fake script).
const STAFF_CASES: StaffCase[] = [
  {
    action: "addDayR1",
    write: async () =>
      addDayR1(PASSWORD, {
        date: "2026-10-20",
        capacity: 24,
        menu: "Menu",
        theme: "",
        openedBy: "M. Dupont",
      }),
    body: { date: "2026-10-20", capacity: 24, menu: "Menu", theme: "", collegue: "M. Dupont" },
  },
  {
    action: "editDayR1",
    write: async () =>
      editDayR1(PASSWORD, { date: "2026-10-06", capacity: 22, menu: "Velouté", theme: "" }),
    body: { date: "2026-10-06", capacity: 22, menu: "Velouté", theme: "" },
  },
  {
    action: "deleteDayR1",
    write: async () => deleteDayR1(PASSWORD, "2026-10-09"),
    body: { date: "2026-10-09" },
  },
  {
    action: "deleteBookingR1",
    write: async () => deleteBookingR1(PASSWORD, "r1b-d+1-ungerer"),
    body: { id: "r1b-d+1-ungerer" },
  },
  {
    action: "editBookingR1",
    write: async () =>
      editBookingR1(PASSWORD, {
        id: "r1b-d+1-ungerer",
        name: "Cyrille Ungerer",
        contact: "c.ungerer@exemple.fr",
        className: "TS2",
        seats: 4,
        students: 3,
        staffMembers: 1,
        externals: 0,
        total: 20.95,
        observation: "",
      }),
    body: {
      id: "r1b-d+1-ungerer",
      nom: "Cyrille Ungerer",
      contact: "c.ungerer@exemple.fr",
      classe: "TS2",
      qte: 4,
      nbEleve: 3,
      nbProf: 1,
      nbExt: 0,
      prixTotal: 20.95,
      observation: "",
    },
  },
  {
    action: "addDayR2",
    write: async () =>
      addDayR2(PASSWORD, {
        date: "2026-10-20",
        note: "",
        theme: "",
        openedBy: "",
        dishes: [{ name: "Lasagnes", stock: 10, price: 4.5, voucher: false }],
      }),
    body: {
      date: "2026-10-20",
      note: "",
      items: [{ name: "Lasagnes", stock: 10, price: 4.5 }],
      theme: "",
      collegue: "",
    },
  },
  {
    action: "addItemR2",
    write: async () =>
      addItemR2(PASSWORD, {
        date: "2026-10-06",
        name: "Salade",
        stock: 5,
        price: null,
        voucher: false,
      }),
    body: { date: "2026-10-06", name: "Salade", stock: 5, price: "" },
  },
  {
    action: "editItemR2",
    write: async () =>
      editItemR2(PASSWORD, {
        dishId: "r2i-d+1-lasagnes",
        name: "Lasagnes",
        stock: 12,
        price: 4.5,
        voucher: false,
      }),
    body: { itemId: "r2i-d+1-lasagnes", name: "Lasagnes", stock: 12, price: 4.5 },
  },
  {
    action: "deleteItemR2",
    write: async () => deleteItemR2(PASSWORD, "r2i-d+1-bowl"),
    body: { itemId: "r2i-d+1-bowl" },
  },
  {
    action: "deleteDayR2",
    write: async () => deleteDayR2(PASSWORD, "2026-10-13"),
    body: { date: "2026-10-13" },
  },
  {
    action: "deleteBookingR2",
    write: async () => deleteBookingR2(PASSWORD, "r2b-d+1-bernard"),
    body: { id: "r2b-d+1-bernard" },
  },
  {
    action: "editBookingR2",
    write: async () =>
      editBookingR2(PASSWORD, {
        id: "r2b-d+1-bernard",
        name: "Noah Bernard",
        contact: "n.bernard@exemple.fr",
        className: "TS1",
        portions: 2,
        serviceMode: "takeaway",
        observation: "",
      }),
    body: {
      id: "r2b-d+1-bernard",
      nom: "Noah Bernard",
      contact: "n.bernard@exemple.fr",
      classe: "TS1",
      qte: 2,
      mode: "emporter",
      observation: "",
    },
  },
  {
    action: "setConfigField",
    write: async () => setConfigField(PASSWORD, { key: "name2", value: "Le Bistrot" }),
    body: { key: "name2", value: "Le Bistrot" },
  },
];

describe("staff actions (02 § 4.7)", () => {
  it.each(STAFF_CASES)(
    "$action sends the body of 02 § 4.7 and reads the full state",
    async ({ action, write, body }) => {
      const fakeScript = start();
      const state = await write();
      expect(fakeScript.requests).toHaveLength(1);
      expect(fakeScript.requests[0]?.json).toStrictEqual({ action, password: PASSWORD, ...body });
      expect(state.r1Bookings.length).toBeGreaterThan(0);
    },
  );

  it.each(STAFF_CASES)(
    "$action throws a PasswordRejectedError on a changed password",
    async ({ write }) => {
      start({ password: "autre" });
      await expect(write()).rejects.toBeInstanceOf(PasswordRejectedError);
    },
  );
});
