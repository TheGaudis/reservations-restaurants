/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs";

import { expect, it } from "vitest";

// API boundary (PLAN § 3.1, § 3.3.6, arbitrage 12): the field names of Code.gs and of the local copy appear only
// in the modules that translate them, the fake script and their tests. Everywhere else, the English model of
// domain/types.ts. Names shared by both (`date`, `contact`, `name1`, `r1Days`…) are not checked.

const SRC = new URL("../", import.meta.url);

const BOUNDARY = [
  "api/schemas.ts",
  "api/staff-schemas.ts",
  "api/actions.ts",
  "api/early-fetch.ts",
  "queries/local-cache.ts",
];

const SCRIPT_FIELDS = [
  // Columns of the sheet (01 § 2) and keys of the local copy (03 § 1.1).
  "Date",
  "Capacite",
  "Menu",
  "Theme",
  "Note",
  "OuvertPar",
  "ID",
  "ItemID",
  "Nom",
  "Stock",
  "Prix",
  "Ticket",
  "Qte",
  "Classe",
  "Contact",
  "Observation",
  "Timestamp",
  "NbEleve",
  "NbProf",
  "NbExt",
  "PrixTotal",
  "Mode",
  "r2Items",
  "r1Used",
  "r2Used",
  "savedAt",
  "contactAnnulation",
  "priceEleve",
  "priceProf",
  "priceExterieur",
  // Bodies and answers of the actions (02 § 4).
  "nom",
  "classe",
  "nbEleve",
  "nbProf",
  "nbExt",
  "qte",
  "prixTotal",
  "itemId",
  "collegue",
  "prix",
  "demande",
  "accorde",
  "_duplicate",
  "_emailStatus",
  "_bookingResult",
];

/** Tests and stories of the fake script kept in src/test/, and this file. */
const FAKE_SCRIPT_TESTS = new Set([
  "test/api-boundary.test.ts",
  "test/browser-fake-script.test.tsx",
  "test/fake-script.stories.tsx",
]);

/** A boundary module, the fake script, or the test of one of them (`schemas.test.ts`, `early-fetch-script.test.tsx`). */
function isAllowed(file: string): boolean {
  if (file.startsWith("mocks/") || FAKE_SCRIPT_TESTS.has(file)) return true;
  return BOUNDARY.some(
    (module) =>
      file === module ||
      (/\.test\.tsx?$/u.test(file) &&
        (file.startsWith(`${module.slice(0, -3)}.`) || file.startsWith(`${module.slice(0, -3)}-`))),
  );
}

function withoutComments(source: string): string {
  return source.replaceAll(/\/\*[\s\S]*?\*\//gu, "").replaceAll(/(?<![:"'`])\/\/.*$/gmu, "");
}

function withoutStrings(code: string): string {
  return code.replaceAll(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/gu, '""');
}

/** Each use of a field of the script: `x.Nom`, `{ Nom: … }`, `{ Nom }`, `"Nom":`, `["Nom"]`, `'surplace'`. */
function scriptFieldsIn(source: string): string[] {
  const code = withoutComments(source);
  const bare = withoutStrings(code);
  const found: string[] = [];
  for (const field of SCRIPT_FIELDS) {
    const uses = [
      new RegExp(`\\.${field}\\b`, "u").test(bare),
      new RegExp(`(?<![\\w$.])${field}\\??\\s*:(?!:)`, "u").test(bare),
      new RegExp(`[{,]\\s*${field}\\s*[,}]`, "u").test(bare),
      new RegExp(`(?:^|[{,])\\s*["'\`]${field}["'\`]\\s*:`, "mu").test(code),
      new RegExp(`[\\w$)\\]]\\[\\s*["'\`]${field}["'\`]\\s*\\]`, "u").test(code),
    ];
    if (uses.some(Boolean)) found.push(field);
  }
  for (const mode of ["surplace", "emporter"]) {
    if (new RegExp(`["'\`]${mode}["'\`]`, "u").test(code)) found.push(mode);
  }
  return found;
}

const files = readdirSync(SRC, { recursive: true, encoding: "utf-8" })
  .map((file) => file.replaceAll("\\", "/"))
  .filter((file) => /\.tsx?$/u.test(file) && file !== "routeTree.gen.ts");

it("finds the fields of the script in a boundary module (self-check)", () => {
  expect(scriptFieldsIn(readFileSync(new URL("api/actions.ts", SRC), "utf-8"))).toStrictEqual(
    expect.arrayContaining(["nom", "classe", "qte", "prixTotal", "itemId", "collegue"]),
  );
  expect(
    scriptFieldsIn('const row = { Date: d }; row.Nom; ({ Qte }); x["Prix"]; "emporter";'),
  ).toStrictEqual(["Date", "Nom", "Prix", "Qte", "emporter"]);
  expect(scriptFieldsIn('Date.now(); new Date(); const s = "Nom : x"; // row.Nom')).toStrictEqual(
    [],
  );
});

it("keeps the fields of the script inside the API boundary (PLAN § 3.3.6)", () => {
  const leaks = files
    .filter((file) => !isAllowed(file))
    .map((file) => [file, scriptFieldsIn(readFileSync(new URL(file, SRC), "utf-8"))] as const)
    .filter(([, fields]) => fields.length > 0);
  expect(leaks).toStrictEqual([]);
});
