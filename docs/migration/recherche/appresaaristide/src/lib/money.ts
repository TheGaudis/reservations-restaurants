/** e.g. `4,95 €` */
export function formatEuro(n: number): string {
  return `${n.toFixed(2).replace(".", ",")} €`;
}

/** Parses a user-typed amount, accepting a comma as decimal separator. */
export function parseAmount(raw: string): number | undefined {
  const trimmed = raw.trim().replace(",", ".");
  if (trimmed === "") return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : Number.NaN;
}

/** Parses a user-typed count; an empty field counts as 0. */
export function parseCount(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed === "") return 0;
  const n = Number(trimmed);
  return Number.isInteger(n) ? n : Number.NaN;
}

/**
 * The count `raw` moved by `delta` and kept within `min` and `max`, as the
 * text of a count field. An empty or invalid value counts as `min`.
 */
export function stepCount(
  raw: string,
  delta: number,
  min: number,
  max = Number.POSITIVE_INFINITY,
): string {
  const n = parseCount(raw);
  const from = Number.isNaN(n) ? min : n;
  return String(Math.max(min, Math.min(max, from + delta)));
}
