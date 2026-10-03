/**
 * Tables of the fake Apps Script (`src/mocks/apps-script.ts`), with the column names of Code.gs `SHEETS`
 * (PLAN § 3.3.6: script fields stay inside `src/mocks/**`).
 */

/** A sheet cell as `getValues()` returns it; dates come back as `yyyy-MM-dd` strings (Code.gs `table`). */
export type Cell = string | number | boolean;

interface R1DayRow {
  Date: Cell;
  Capacite: Cell;
  Menu: Cell;
  Theme: Cell;
  OuvertPar: Cell;
}

export interface R1BookingRow {
  ID: Cell;
  Date: Cell;
  Nom: Cell;
  Contact: Cell;
  Classe: Cell;
  Qte: Cell;
  Timestamp: Cell;
  Observation: Cell;
  NbEleve: Cell;
  NbProf: Cell;
  NbExt: Cell;
  PrixTotal: Cell;
}

interface R2DayRow {
  Date: Cell;
  Note: Cell;
  Theme: Cell;
  OuvertPar: Cell;
}

interface R2ItemRow {
  ID: Cell;
  Date: Cell;
  Nom: Cell;
  Stock: Cell;
  Prix: Cell;
}

export interface R2BookingRow {
  ID: Cell;
  ItemID: Cell;
  Date: Cell;
  Nom: Cell;
  Contact: Cell;
  Classe: Cell;
  Qte: Cell;
  Mode: Cell;
  Timestamp: Cell;
  Observation: Cell;
}

/** Server state: the sheet tabs, the etag of the public state and what CacheService and MailApp would hold. */
export interface FakeDb {
  /** Etag of the current public content; replaced by `E<n+1>` when that content changes (02 § 3.2). */
  etag: string;
  /** `Config` tab (Key → Value); a missing or empty value gets the script's default (Code.gs `getConfig`). */
  config: Record<string, Cell>;
  r1Days: R1DayRow[];
  r1Bookings: R1BookingRow[];
  r2Days: R2DayRow[];
  r2Items: R2ItemRow[];
  r2Bookings: R2BookingRow[];
  /** `requestId` of the bookings already written (CacheService `req_…`, 02 § 5.3). */
  requestIds: string[];
  /** Reason returned by MailApp for every confirmation e-mail while set (`_emailStatus`, 02 § 4.4). */
  mailError: string | null;
}

/** `_emailStatus` once the queued e-mails are sent (02 § 4.4). */
interface EmailStatus {
  sent: boolean;
  reason?: string;
}

/** Server side of the fake: what `doGet`, `doPost` and the actions of Code.gs share. */
export interface Script {
  db: FakeDb;
  /** Public state; its etag follows the content, whoever changed the tables. */
  publicState: () => { etag: string } & Record<string, unknown>;
  alreadyProcessed: (requestId: unknown) => boolean;
  markProcessed: (requestId: unknown) => void;
  sendMail: (contact: unknown) => EmailStatus;
  checkPassword: (candidate: unknown) => boolean;
  setPassword: (password: string) => void;
}
