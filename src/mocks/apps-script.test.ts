import { describe, expect, it } from "vitest";

import { APPS_SCRIPT_URL_PATTERN } from "@/mocks/apps-script";
import { exampleDb } from "@/mocks/fixtures/example-db";
import publicStateExample from "@/mocks/fixtures/public-state.json" with { type: "json" };
import { createSeed } from "@/mocks/fixtures/seed";
import unchangedExample from "@/mocks/fixtures/unchanged.json" with { type: "json" };
import { getState, postAction, SCRIPT_URL, fakeScriptPerTest } from "@/test/fake-script-server";

const LOCK_BUSY = "Le serveur est très sollicité : réessayez dans quelques secondes.";
const start = fakeScriptPerTest();

const booking = {
  action: "addBookingR1",
  date: "2026-10-06",
  nom: "Inès Roux",
  contact: "i.roux@exemple.fr",
  nbEleve: 1,
  requestId: "req-r1",
};

async function etag(query = ""): Promise<unknown> {
  const state = await getState(query);
  return state["etag"];
}

describe("public read (02 § 3)", () => {
  it("answers the public state of 02 § 3.2", async () => {
    start({ seed: exampleDb() });
    expect(await getState()).toStrictEqual(publicStateExample);
  });

  it("answers { unchanged } to the current etag only (02 § 3.3)", async () => {
    start({ seed: exampleDb() });
    expect(await getState(`?since=${publicStateExample.etag}`)).toStrictEqual(unchangedExample);
    expect(await getState("?since=OLD")).toStrictEqual(publicStateExample);
  });

  it("keeps names, contacts and observations out of the public state", async () => {
    start();
    const text = JSON.stringify(await getState());
    for (const word of ["Ungerer", "exemple.fr", "fenêtre", "OuvertPar", "Contact", "PrixTotal"]) {
      expect(text).not.toContain(word);
    }
  });

  it("changes the etag when the public content changes, whoever changed it", async () => {
    const fake = start();
    expect(await etag()).toBe("E1");
    expect(await etag()).toBe("E1");
    fake.db.config["name1"] = "Restaurant d'application";
    expect(await etag("?since=E1")).toBe("E2");
    expect(await getState("?since=E2")).toStrictEqual({ unchanged: true, etag: "E2" });
    await postAction(booking);
    expect(await etag("?since=E2")).toBe("E3");
  });

  it("gives the script's defaults to empty settings (Code.gs getConfig)", async () => {
    start({ seed: { ...createSeed(), config: { name1: "", priceEleve: 0 } } });
    expect(await getState()).toMatchObject({
      name1: "Restaurant 1",
      name2: "Restaurant 2",
      desc1: "Table réservée par nombre de couverts, avec le menu du jour.",
      desc2: "Plats à emporter ou sur place, chacun avec son propre stock.",
      contactAnnulation: "l'établissement",
      priceEleve: "4.95",
      priceProf: "6.10",
      priceExterieur: "9.90",
    });
  });

  it("answers any deployment id, with open CORS, and records the request", async () => {
    const fake = start();
    const legacyUrl = "https://script.google.com/macros/s/AKfycbz-legacy_ID/exec?since=abc";
    const response = await fetch(legacyUrl);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(fake.requests).toStrictEqual([
      {
        method: "GET",
        url: legacyUrl,
        headers: expect.any(Object) as unknown,
        body: "",
        json: null,
      },
    ]);
    expect(APPS_SCRIPT_URL_PATTERN).toBe("https://script.google.com/macros/s/:deploymentId/exec");
  });
});

describe("actions other than the public bookings (02 § 4.1)", () => {
  it.each([
    [{ action: "foo" }, "Action inconnue: foo"],
    [{}, "Action inconnue: undefined"],
    [[1, 2], "Action inconnue: undefined"],
    [{ action: "getAdminState", password: "faux" }, "Mot de passe incorrect."],
    [{ action: "setConfigField", key: "name1", value: "X" }, "Mot de passe incorrect."],
    [
      { action: "getAdminState", password: "secret" },
      "Action non implémentée par le faux script : getAdminState",
    ],
    [
      { action: "checkPassword", password: "secret" },
      "Action jamais envoyée par le site, refusée par le faux script : checkPassword",
    ],
    [
      { action: "addBookingR2" },
      "Action jamais envoyée par le site, refusée par le faux script : addBookingR2",
    ],
  ])("answers %j with « %s »", async (body, error) => {
    start();
    expect(await postAction(body)).toStrictEqual({ error });
  });

  it("answers an unreadable body with the message of JSON.parse", async () => {
    start();
    const response = await fetch(SCRIPT_URL, { method: "POST", body: "{nope" });
    const { error } = (await response.json()) as { error: string };
    expect(error).toMatch(/JSON/u);
  });

  it("checks the password changed by setPassword (REG-31)", async () => {
    const fake = start({ password: "premier" });
    const wrong = { error: "Mot de passe incorrect." };
    expect(await postAction({ action: "getAdminState", password: "secret" })).toStrictEqual(wrong);
    fake.setPassword("autre");
    expect(await postAction({ action: "getAdminState", password: "premier" })).toStrictEqual(wrong);
    const accepted = await postAction({ action: "getAdminState", password: "autre" });
    expect(accepted["error"]).toMatch(/non implémentée/u);
  });
});

describe("failNext and hold", () => {
  it("serves Google's HTML error page without processing the request (02 § 1.6)", async () => {
    const fake = start();
    const rows = fake.db.r1Bookings.length;
    fake.failNext("html");
    const response = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(booking) });
    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toMatch(/^text\/html/u);
    await expect(response.json()).rejects.toThrow(SyntaxError);
    expect(fake.db.r1Bookings).toHaveLength(rows);
  });

  it("drops the connection after writing (lost response, REG-19)", async () => {
    const fake = start();
    const rows = fake.db.r1Bookings.length;
    fake.failNext("network");
    const request = fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(booking) });
    await expect(request).rejects.toThrow(TypeError);
    expect(fake.db.r1Bookings).toHaveLength(rows + 1);
    const retry = await postAction(booking);
    expect(retry["_duplicate"]).toBe(true);
  });

  it("answers { error } without processing, with the lock message by default", async () => {
    const fake = start();
    fake.failNext("error");
    fake.failNext("error", "Erreur du script");
    expect(await postAction(booking)).toStrictEqual({ error: LOCK_BUSY });
    expect(await getState()).toStrictEqual({ error: "Erreur du script" });
    expect(fake.db.r1Bookings.filter((b) => b.Nom === "Inès Roux")).toStrictEqual([]);
    expect(await etag()).toBe("E1");
  });

  it("fails reads too, one queued failure per request", async () => {
    const fake = start();
    fake.failNext("network");
    fake.failNext("html");
    await expect(fetch(SCRIPT_URL)).rejects.toThrow(TypeError);
    const page = await fetch(SCRIPT_URL);
    expect(page.status).toBe(500);
    expect(await etag()).toBe("E1");
    expect(fake.requests).toHaveLength(3);
  });

  it("holds the next request until released, and only that one", async () => {
    const fake = start();
    const release = fake.hold();
    const progress = { answered: false };
    const held = (async () => {
      await fetch(SCRIPT_URL);
      progress.answered = true;
    })();
    await expect.poll(() => fake.requests.length).toBe(1);
    expect(await etag()).toBe("E1");
    expect(progress.answered).toBe(false);
    release();
    await held;
    expect(progress.answered).toBe(true);
  });

  it("does not hold a request released beforehand", async () => {
    const fake = start();
    fake.hold()();
    expect(await etag()).toBe("E1");
  });
});
