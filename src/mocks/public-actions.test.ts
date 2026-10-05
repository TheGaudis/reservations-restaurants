import { describe, expect, it } from "vitest";

import addBookingR1Request from "@/mocks/fixtures/add-booking-r1-request.json" with { type: "json" };
import addBookingR2MultiRequest from "@/mocks/fixtures/add-booking-r2-multi-request.json" with { type: "json" };
import addBookingR2MultiResult from "@/mocks/fixtures/add-booking-r2-multi-result.json" with { type: "json" };
import { exampleDb } from "@/mocks/fixtures/example-db";
import publicStateExample from "@/mocks/fixtures/public-state.json" with { type: "json" };
import { postAction, fakeScriptPerTest } from "@/test/fake-script-server";

const start = fakeScriptPerTest();
const QUANTITY_ERROR = "Quantité invalide : indiquez un nombre entier positif.";

const r1Request = (fields: Record<string, unknown>) => ({
  action: "addBookingR1",
  date: "2026-10-06",
  nom: "Inès Roux",
  contact: "i.roux@exemple.fr",
  classe: "TS1",
  nbEleve: 1,
  nbProf: 0,
  nbExt: 0,
  observation: "",
  requestId: "req-r1",
  ...fields,
});

const r2Request = (items: unknown) => ({
  action: "addBookingR2Multi",
  date: "2026-10-05",
  nom: "Inès Roux",
  contact: "i.roux@exemple.fr",
  classe: "TS1",
  mode: "surplace",
  items,
  observation: "",
  requestId: "req-r2",
});

describe("addBookingR1 (02 § 4.4)", () => {
  it("books the example of 02 § 4.4 and answers the public state with _emailStatus", async () => {
    const fake = start({ seed: exampleDb() });
    const response = await postAction(addBookingR1Request);
    expect(response).toMatchObject({
      r1Bookings: [{ Date: "2026-10-05", Qte: 15 }],
      _emailStatus: { sent: true },
    });
    expect(response["etag"]).not.toBe(publicStateExample.etag);
    expect(fake.db.r1Bookings.at(-1)).toStrictEqual({
      ID: expect.any(String) as unknown,
      Date: "2026-10-05",
      Nom: "Cyrille Ungerer",
      Contact: "c.ungerer@exemple.fr",
      Classe: "TS2",
      Qte: 3,
      Timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/u) as unknown,
      Observation: "Table partagée",
      NbEleve: 2,
      NbProf: 1,
      NbExt: 0,
      PrixTotal: 16,
    });
    expect(fake.requests[0]).toMatchObject({
      method: "POST",
      headers: { "content-type": "text/plain;charset=utf-8" },
      json: addBookingR1Request,
    });
  });

  it("answers _duplicate for a requestId already written, before any check (02 § 5.3)", async () => {
    const fake = start();
    await postAction(r1Request({}));
    const rows = fake.db.r1Bookings.length;
    const response = await postAction(r1Request({ nbEleve: -1, date: "1999-01-01" }));
    expect(response["_duplicate"]).toBe(true);
    expect(response).not.toHaveProperty("_emailStatus");
    expect(response["r1Days"]).toBeDefined();
    expect(fake.db.r1Bookings).toHaveLength(rows);
  });

  it.each([
    [{ nbEleve: -1 }, QUANTITY_ERROR],
    [{ nbProf: 2.5 }, QUANTITY_ERROR],
    [{ nbExt: "abc" }, QUANTITY_ERROR],
    [{ nbEleve: 0 }, "Merci de renseigner au moins une personne."],
    [{ nbEleve: "", nbProf: null }, "Merci de renseigner au moins une personne."],
    [{ date: "2026-10-07" }, "Ce jour n'existe plus."],
    [{ nbEleve: 6 }, "Il ne reste que 5 couvert(s) pour ce jour."],
    [{ nbEleve: -1, date: "2026-10-07" }, QUANTITY_ERROR],
  ])("refuses %o with « %s », writes nothing, keeps the requestId free", async (fields, error) => {
    const fake = start();
    const rows = fake.db.r1Bookings.length;
    expect(await postAction(r1Request(fields))).toStrictEqual({ error });
    expect(fake.db.r1Bookings).toHaveLength(rows);
    expect(fake.db.requestIds).toStrictEqual([]);
  });

  it("reads empty counters as 0 and takes the last free seats", async () => {
    const fake = start();
    const response = await postAction(r1Request({ nbEleve: "", nbProf: null, nbExt: "5" }));
    expect(response["_emailStatus"]).toStrictEqual({ sent: true });
    expect(fake.db.r1Bookings.at(-1)).toMatchObject({
      Qte: 5,
      NbEleve: 0,
      NbProf: 0,
      NbExt: 5,
      PrixTotal: 49.5,
    });
  });

  const quota = "Service invoked too many times for one day: email.";
  it.each([
    ["06 12 34 56 78", null, { sent: false, reason: "no-email" }],
    ["", null, { sent: false, reason: "no-email" }],
    ["i.roux@exemple.fr", quota, { sent: false, reason: quota }],
  ])("reports the e-mail to %j (MailApp error %j) as %o", async (contact, mailError, status) => {
    const fake = start();
    fake.db.mailError = mailError;
    const response = await postAction(r1Request({ contact }));
    expect(response["_emailStatus"]).toStrictEqual(status);
  });
});

describe("addBookingR2Multi (02 § 4.5)", () => {
  it("books the example of 02 § 4.5", async () => {
    const fake = start({ seed: exampleDb() });
    const response = await postAction(addBookingR2MultiRequest);
    expect(response["_bookingResult"]).toStrictEqual({
      ...addBookingR2MultiResult._bookingResult,
      adjusted: [],
      skipped: [],
    });
    expect(response["_emailStatus"]).toStrictEqual({ sent: true });
    expect(response["r2Bookings"]).toStrictEqual([
      { ItemID: "3f1c2a9e-…", Qte: 5 },
      { ItemID: "8b7d0c11-…", Qte: 1 },
    ]);
    expect(fake.db.r2Bookings.slice(-2)).toMatchObject([
      { ItemID: "3f1c2a9e-…", Date: "2026-10-06", Nom: "Ariele Gsell", Qte: 2, Mode: "surplace" },
      { ItemID: "8b7d0c11-…", Qte: 1, Classe: "Vie scolaire", Observation: "" },
    ]);
  });

  it("reduces each dish to its stock, counting the earlier lines of the same order", async () => {
    const fake = start();
    const response = await postAction(
      r2Request([
        { itemId: "r2i-d0-lasagnes", qte: 3 },
        { itemId: "r2i-d0-lasagnes", qte: 3 },
        { itemId: "r2i-deleted", qte: 1 },
        { itemId: "r2i-d0-salade", qte: 0 },
        { itemId: "r2i-d+6-couscous", qte: 1 },
        { itemId: "r2i-d0-wrap", qte: 1 },
      ]),
    );
    expect(response["_bookingResult"]).toStrictEqual({
      confirmed: [
        { itemId: "r2i-d0-lasagnes", nom: "Lasagnes", qte: 3, prix: 4.5 },
        { itemId: "r2i-d0-lasagnes", nom: "Lasagnes", qte: 1, prix: 4.5 },
        { itemId: "r2i-d0-wrap", nom: "Wrap (ticket restaurant)", qte: 1, prix: "" },
      ],
      adjusted: [{ nom: "Lasagnes", demande: 3, accorde: 1 }],
      skipped: [{ nom: "(plat supprimé)" }, { nom: "Couscous" }],
      totalPrix: 18,
      hasPriceGap: true,
    });
    expect(fake.db.r2Bookings.filter((b) => b.Nom === "Inès Roux")).toHaveLength(3);
  });

  it("answers an empty confirmed list without e-mail and keeps the requestId free", async () => {
    const fake = start();
    const response = await postAction(r2Request([{ itemId: "r2i-d+6-tajine", qte: 1 }]));
    expect(response["_bookingResult"]).toMatchObject({
      confirmed: [],
      skipped: [{ nom: "Tajine" }],
    });
    expect(response["_emailStatus"]).toBeNull();
    expect(fake.db.requestIds).toStrictEqual([]);
    const retry = await postAction(r2Request([{ itemId: "r2i-d0-salade", qte: 1 }]));
    expect(retry).not.toHaveProperty("_duplicate");
    expect(retry["_bookingResult"]).toMatchObject({
      confirmed: [{ nom: "Salade", qte: 1, prix: "" }],
    });
  });

  it("answers _duplicate once the requestId is written, after checking the quantities", async () => {
    const fake = start();
    await postAction(r2Request([{ itemId: "r2i-d0-salade", qte: 1 }]));
    const rows = fake.db.r2Bookings.length;
    const response = await postAction(r2Request([{ itemId: "r2i-d0-salade", qte: 4 }]));
    expect(response).toMatchObject({ _duplicate: true });
    expect(response).not.toHaveProperty("_bookingResult");
    expect(fake.db.r2Bookings).toHaveLength(rows);
    const invalid = await postAction(r2Request([{ itemId: "r2i-d0-salade", qte: -1 }]));
    expect(invalid).toStrictEqual({ error: QUANTITY_ERROR });
  });

  it.each([
    [undefined, "Choisissez au moins un plat."],
    ["r2i-d0-salade", "Choisissez au moins un plat."],
    [[{ itemId: "r2i-d0-salade", qte: 1.5 }], QUANTITY_ERROR],
  ])("refuses items %j with « %s »", async (items, error) => {
    const fake = start();
    const rows = fake.db.r2Bookings.length;
    expect(await postAction(r2Request(items))).toStrictEqual({ error });
    expect(fake.db.r2Bookings).toHaveLength(rows);
  });
});
