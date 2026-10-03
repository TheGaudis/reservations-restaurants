import type { FakeDb } from "@/mocks/fake-db";
import publicState from "@/mocks/fixtures/public-state.json" with { type: "json" };

/**
 * Tables whose public state is the example of 02 § 3.2 (`public-state.json`), etag included: one anonymous
 * booking per total of the example.
 */
export function exampleDb(): FakeDb {
  const { etag, r1Days, r1Bookings, r2Days, r2Items, r2Bookings, ...config } = publicState;
  return {
    etag,
    config,
    r1Days: r1Days.map((d) => ({
      Date: d.Date,
      Capacite: d.Capacite,
      Menu: d.Menu,
      Theme: d.Theme,
      OuvertPar: "",
    })),
    r1Bookings: r1Bookings.map((b) => ({
      ID: "",
      Date: b.Date,
      Nom: "",
      Contact: "",
      Classe: "",
      Timestamp: "",
      Observation: "",
      Qte: b.Qte,
      NbEleve: "",
      NbProf: "",
      NbExt: "",
      PrixTotal: "",
    })),
    r2Days: r2Days.map((d) => ({ Date: d.Date, Note: d.Note, Theme: d.Theme, OuvertPar: "" })),
    r2Items,
    r2Bookings: r2Bookings.map((b) => ({
      ID: "",
      ItemID: b.ItemID,
      Date: "2026-10-06",
      Nom: "",
      Contact: "",
      Classe: "",
      Qte: b.Qte,
      Mode: "surplace",
      Timestamp: "",
      Observation: "",
    })),
    requestIds: [],
    mailError: null,
  };
}
