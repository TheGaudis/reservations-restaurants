/** Dates are `YYYY-MM-DD` strings in the browser's local time zone. */

const pad = (n: number) => String(n).padStart(2, "0");

function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISO(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

export function todayISO(): string {
  return toISO(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function addMonths(iso: string, n: number): string {
  const d = parseISO(iso);
  return toISO(new Date(d.getFullYear(), d.getMonth() + n, 1));
}

/** Monday of the week containing `iso`. */
function startOfWeek(iso: string): string {
  const offset = (parseISO(iso).getDay() + 6) % 7;
  return addDays(iso, -offset);
}

function range(start: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

export function weekDates(anchor: string): string[] {
  return range(startOfWeek(anchor), 7);
}

/** 6 full weeks starting on the Monday on or before the 1st of the month. */
export function monthGridDates(anchor: string): string[] {
  return range(startOfWeek(`${anchor.slice(0, 7)}-01`), 42);
}

export function sameMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

export function dayOfMonth(iso: string): number {
  return parseISO(iso).getDate();
}

/** e.g. `mercredi 23 septembre 2026` */
export function formatLongDate(iso: string): string {
  return parseISO(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** e.g. `28 sept.` */
function formatDayMonth(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/**
 * e.g. `21 – 27 sept. 2026`, `28 sept. – 4 oct. 2026`,
 * `28 déc. 2026 – 3 janv. 2027`.
 */
export function formatWeekLabel(anchor: string): string {
  const [mondayISO = anchor] = weekDates(anchor);
  const monday = parseISO(mondayISO);
  const sunday = parseISO(addDays(mondayISO, 6));
  const end = `${formatDayMonth(sunday)} ${sunday.getFullYear()}`;
  if (monday.getFullYear() !== sunday.getFullYear()) {
    return `${formatDayMonth(monday)} ${monday.getFullYear()} – ${end}`;
  }
  if (monday.getMonth() !== sunday.getMonth()) {
    return `${formatDayMonth(monday)} – ${end}`;
  }
  return `${monday.getDate()} – ${end}`;
}

/** e.g. `Septembre 2026` */
export function formatMonthLabel(anchor: string): string {
  const label = parseISO(anchor).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
