import type { FakeDb, Script } from "@/mocks/fake-db";
import { addBookingR1, addBookingR2Multi } from "@/mocks/public-actions";
import { isEmail, isRecord, publicContent } from "@/mocks/sheet";
import type { Body } from "@/mocks/sheet";

type Action = (script: Script, body: Body) => object;

// Actions of 02 § 4.7 and getAdminState: password first, as every one of them in Code.gs.
const STAFF_ACTIONS = [
  "getAdminState",
  "addDayR1",
  "editDayR1",
  "deleteDayR1",
  "deleteBookingR1",
  "editBookingR1",
  "addDayR2",
  "addItemR2",
  "editItemR2",
  "deleteItemR2",
  "deleteDayR2",
  "deleteBookingR2",
  "editBookingR2",
  "setConfigField",
];
// Known to Code.gs, never sent by the site (02 § 4.2, § 4.6).
const UNUSED_ACTIONS = ["checkPassword", "addBookingR2"];

const ACTIONS = new Map<string, Action>([
  ["addBookingR1", addBookingR1],
  ["addBookingR2Multi", addBookingR2Multi],
  ...STAFF_ACTIONS.map((name): [string, Action] => [
    name,
    (script, body) => {
      if (!script.checkPassword(body["password"])) {
        throw new Error("Mot de passe incorrect.");
      }
      throw new Error(`Action non implémentée par le faux script : ${name}`);
    },
  ]),
  ...UNUSED_ACTIONS.map((name): [string, Action] => [
    name,
    () => {
      throw new Error(`Action jamais envoyée par le site, refusée par le faux script : ${name}`);
    },
  ]),
]);

function nextEtag(etag: string): string {
  const n = /^E(?<n>\d+)$/u.exec(etag)?.groups?.["n"];
  return `E${(n === undefined ? 1 : Number(n)) + 1}`;
}

// Code.gs `requestKey`: first 100 characters of the requestId, none when it is empty (02 § 5.3).
function requestKey(requestId: unknown): string | null {
  const present = Boolean(requestId);
  return present ? String(requestId).slice(0, 100) : null;
}

/** Server state: a copy of `seed`, changed by the actions and by the tests. */
export function createScript(seed: FakeDb, initialPassword: string): Script {
  const db = structuredClone(seed);
  let password = initialPassword;
  let etagContent = JSON.stringify(publicContent(db));
  return {
    db,
    publicState: () => {
      const content = publicContent(db);
      const text = JSON.stringify(content);
      if (text !== etagContent) {
        db.etag = nextEtag(db.etag);
        etagContent = text;
      }
      return { etag: db.etag, ...content };
    },
    alreadyProcessed: (requestId) => {
      const key = requestKey(requestId);
      return key !== null && db.requestIds.includes(key);
    },
    markProcessed: (requestId) => {
      const key = requestKey(requestId);
      if (key !== null) {
        db.requestIds.push(key);
      }
    },
    sendMail: (contact) => {
      if (!isEmail(contact)) {
        return { sent: false, reason: "no-email" };
      }
      return db.mailError === null ? { sent: true } : { sent: false, reason: db.mailError };
    },
    checkPassword: (candidate) => password !== "" && String(candidate) === password,
    setPassword: (next) => {
      password = next;
    },
  };
}

/** Code.gs `doGet`: `?since=` equal to the current etag gets `{ unchanged }` (02 § 3.3). */
export function doGet(script: Script, url: string): object {
  const since = new URL(url).searchParams.get("since") ?? "";
  const state = script.publicState();
  return since !== "" && since === state.etag ? { unchanged: true, etag: state.etag } : state;
}

/** Code.gs `doPost`: any exception becomes `{ error: message }`, answered with status 200 (02 § 1.3). */
export function doPost(script: Script, text: string): object {
  try {
    const body: unknown = JSON.parse(text);
    if (body === null) {
      throw new TypeError("Cannot read properties of null (reading 'action')");
    }
    const name = isRecord(body) ? body["action"] : undefined;
    const action = typeof name === "string" ? ACTIONS.get(name) : undefined;
    if (action === undefined || !isRecord(body)) {
      throw new Error(`Action inconnue: ${String(name)}`);
    }
    return action(script, body);
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
