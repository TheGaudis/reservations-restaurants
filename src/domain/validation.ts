// Field rules and number parsing of the forms. Adapted from AppResaAristide `src/lib/validators.ts` and
// `src/lib/money.ts`. A rule returns the message it receives, never a text of its own: the forms pass messages
// written with react-intl (04 § 5.2-5.4, 06).

/**
 * A rule on a text field, in the shape TanStack Form passes to a field validator: the message when the value
 * breaks it, else `undefined`. Every rule but `required` lets an empty value through, so that an optional field
 * only complains about what was typed.
 */
export type Validator<M> = (field: { value: string }) => M | undefined;

/** E-mail shape checked by the page (`emailError`, 00 § 3); the script uses a looser one (01 point 8). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** Parses a typed amount, comma or dot as decimal separator: `undefined` when blank, `NaN` when not a number. */
export function parseAmount(raw: string): number | undefined {
  const trimmed = raw.trim().replace(",", ".");
  if (trimmed === "") return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : Number.NaN;
}

/** Parses a typed count: 0 when blank, `NaN` when not an integer (`2.7` included, E-19). */
export function parseCount(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed === "") return 0;
  const n = Number(trimmed);
  return Number.isInteger(n) ? n : Number.NaN;
}

/** Value of a number field: an empty field (`null`) counts 0 (PLAN § 3.5, 06 § 7.3). */
export function countValue(value: number | null): number {
  return value ?? 0;
}

/**
 * The count `raw` moved by `delta` and kept between `min` and `max`, as the text of a count field (−/+ buttons,
 * D-17). An empty or invalid value counts as `min`.
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

export function required<M>(message: M): Validator<M> {
  return ({ value }) => (value.trim() === "" ? message : undefined);
}

/** Looks like an e-mail address (04 § 5.2, 06 § 8.1); the script checks it again before sending mail. */
export function email<M>(message: M): Validator<M> {
  return ({ value }) => (value.trim() === "" || isEmail(value) ? undefined : message);
}

/** An integer of at least 1 (capacity, stock, portions: 06 § 4.1, § 6.1, § 7.4). */
export function positiveInteger<M>(message: M): Validator<M> {
  return ({ value }) => {
    const n = parseCount(value);
    return value.trim() !== "" && (Number.isNaN(n) || n < 1) ? message : undefined;
  };
}

/** An integer of at least 0. */
export function nonNegativeInteger<M>(message: M): Validator<M> {
  return ({ value }) => {
    const n = parseCount(value);
    return Number.isNaN(n) || n < 0 ? message : undefined;
  };
}

/** An integer of at least `min`; blank and non-integer values pass. */
export function atLeast<M>(min: number, message: M): Validator<M> {
  return ({ value }) => {
    const n = parseCount(value);
    return value.trim() !== "" && Number.isInteger(n) && n < min ? message : undefined;
  };
}

/** An integer of at most `max`; non-integer values pass. */
export function atMost<M>(max: number, message: M): Validator<M> {
  return ({ value }) => {
    const n = parseCount(value);
    return Number.isInteger(n) && n > max ? message : undefined;
  };
}

function isCents(n: number): boolean {
  return Math.round(n * 100) / 100 === n;
}

/** An amount of at least 0 with two decimals at most (prices of the settings, D-20). */
export function nonNegativeAmount<M>(message: M): Validator<M> {
  return ({ value }) => {
    const n = parseAmount(value);
    return n !== undefined && (Number.isNaN(n) || n < 0 || !isCents(n)) ? message : undefined;
  };
}

/** An amount above 0 with two decimals at most; blank passes, 0 does not (dish price, D-22). */
export function positiveAmount<M>(message: M): Validator<M> {
  return ({ value }) => {
    const n = parseAmount(value);
    return n !== undefined && (Number.isNaN(n) || n <= 0 || !isCents(n)) ? message : undefined;
  };
}

/** Runs the rules in order and reports the first one that fails (the order of the messages, 04 § 5.2). */
export function compose<M>(...rules: Array<Validator<M>>): Validator<M> {
  return (field) => {
    let message: M | undefined;
    for (const rule of rules) {
      message = rule(field);
      if (message !== undefined) break;
    }
    return message;
  };
}
