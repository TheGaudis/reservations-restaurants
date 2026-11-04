const PARIS = "Europe/Paris";

const parisDateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: PARIS,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const parisHourFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: PARIS,
  hour: "2-digit",
  hourCycle: "h23",
});

function part(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  const found = parts.find((p) => p.type === type);
  if (found === undefined) throw new Error(`Missing date part ${type}`);
  return found.value;
}

/** Europe/Paris calendar date (`YYYY-MM-DD`) of the instant `now` (ms since epoch). */
export function parisDate(now: number): string {
  const parts = parisDateFormat.formatToParts(new Date(now));
  return `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")}`;
}

/** Europe/Paris hour (0-23) of the instant `now` (ms since epoch). */
export function parisHour(now: number): number {
  return Number(part(parisHourFormat.formatToParts(new Date(now)), "hour"));
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function toUtcMs(date: string): number | null {
  const match = ISO_DATE.exec(date);
  if (match === null) return null;
  const [, y, m, d] = match.map(Number);
  if (y === undefined || m === undefined || d === undefined) return null;
  const ms = Date.UTC(y, m - 1, d);
  const back = new Date(ms);
  if (
    back.getUTCFullYear() !== y ||
    back.getUTCMonth() !== m - 1 ||
    back.getUTCDate() !== d
  ) {
    return null;
  }
  return ms;
}

export function isIsoDate(date: string): boolean {
  return toUtcMs(date) !== null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function mustParse(date: string): number {
  const ms = toUtcMs(date);
  if (ms === null) throw new Error(`Invalid date ${date}`);
  return ms;
}

export function addDays(date: string, days: number): string {
  return new Date(mustParse(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Number of days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((mustParse(to) - mustParse(from)) / DAY_MS);
}

const WEEKDAYS = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];
const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/** Long French date, e.g. `mercredi 23 septembre 2026`. */
export function formatDateFr(date: string): string {
  const d = new Date(mustParse(date));
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
