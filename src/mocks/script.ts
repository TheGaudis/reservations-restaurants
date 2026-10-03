import type { FakeDb, Script } from "@/mocks/fake-db";
import { addBookingR1, addBookingR2Multi } from "@/mocks/public-actions";
import { cell, fullState, isEmail, isRecord, publicContent } from "@/mocks/sheet";
import type { Body, Write } from "@/mocks/sheet";
import { R1_WRITES } from "@/mocks/staff-r1";
import { R2_WRITES } from "@/mocks/staff-r2";

type Action = (script: Script, body: Body) => object;

export const LOCK_BUSY = "Le serveur est très sollicité : réessayez dans quelques secondes.";

// 02 § 1.7: every other action, unknown ones included, waits for the script lock.
const WITHOUT_LOCK = new Set(["checkPassword", "getAdminState"]);

/** Code.gs `setConfigValue`: any key, no allow-list (b-10); `""` brings back the script's default (b-9). */
const setConfigField: Write = (script, body) => {
  const { db } = script;
  const key = String(body["key"]);
  // A new row stores the key as a cell: undefined or null becomes an empty key.
  const row = Object.hasOwn(db.config, key) ? key : String(cell(body["key"]));
  db.config[row] = cell(body["value"]);
};

const WRITES: Record<string, Write> = { ...R1_WRITES, ...R2_WRITES, setConfigField };

// 02 § 4.1: the password first, as in every protected function of Code.gs, then the full state.
function protectedAction(write?: Write): Action {
  return (script, body) => {
    if (!script.checkPassword(body["password"])) {
      throw new Error("Mot de passe incorrect.");
    }
    write?.(script, body);
    return fullState(script.db);
  };
}

// Known to Code.gs, never sent by the site (02 § 4.2, § 4.6).
function refused(name: string): [string, Action] {
  return [
    name,
    () => {
      throw new Error(`Action jamais envoyée par le site, refusée par le faux script : ${name}`);
    },
  ];
}

const ACTIONS = new Map<string, Action>([
  ["addBookingR1", addBookingR1],
  ["addBookingR2Multi", addBookingR2Multi],
  ["getAdminState", protectedAction()],
  ...Object.entries(WRITES).map(([name, write]): [string, Action] => [
    name,
    protectedAction(write),
  ]),
  refused("checkPassword"),
  refused("addBookingR2"),
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
    if (script.db.lockBusy === true && !WITHOUT_LOCK.has(String(name))) {
      throw new Error(LOCK_BUSY);
    }
    const action = typeof name === "string" ? ACTIONS.get(name) : undefined;
    if (action === undefined || !isRecord(body)) {
      throw new Error(`Action inconnue: ${String(name)}`);
    }
    return action(script, body);
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
