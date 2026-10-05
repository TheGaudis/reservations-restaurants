import { parseAmount, parseCount } from "./money";

/**
 * A rule on a text input, in the shape TanStack Form passes to a field
 * validator: the French message to show when the value breaks it, else
 * `undefined`. Use it as `validators={{ onChange: rule }}` on a `form.AppField`.
 *
 * Every rule but `required` lets an empty value through, so an optional field
 * only complains about what was typed.
 */
export type Validator = (field: { value: string }) => string | undefined;

export const required =
  (message: string): Validator =>
  ({ value }) =>
    value.trim() === "" ? message : undefined;

/** An integer of at least 1. */
export const positiveInteger =
  (message: string): Validator =>
  ({ value }) => {
    const n = parseCount(value);
    return value.trim() !== "" && (Number.isNaN(n) || n < 1)
      ? message
      : undefined;
  };

/** An integer of at least 0. */
export const nonNegativeInteger =
  (message: string): Validator =>
  ({ value }) => {
    const n = parseCount(value);
    return Number.isNaN(n) || n < 0 ? message : undefined;
  };

/** An integer of at least `min`; blank and non-integer values pass. */
export const atLeast =
  (min: number, message: string): Validator =>
  ({ value }) => {
    const n = parseCount(value);
    return value.trim() !== "" && Number.isInteger(n) && n < min
      ? message
      : undefined;
  };

/** An integer of at most `max`; non-integer values pass. */
export const atMost =
  (max: number, message: string): Validator =>
  ({ value }) => {
    const n = parseCount(value);
    return Number.isInteger(n) && n > max ? message : undefined;
  };

/**
 * An amount of at least 0 with at most two decimals (cents), with a dot or
 * a comma as decimal separator.
 */
export const nonNegativeAmount =
  (message: string): Validator =>
  ({ value }) => {
    const n = parseAmount(value);
    const invalid =
      n !== undefined &&
      (Number.isNaN(n) || n < 0 || Math.round(n * 100) / 100 !== n);
    return invalid ? message : undefined;
  };

/** Something that looks like an email address; the server checks it again. */
export const email =
  (message: string): Validator =>
  ({ value }) => {
    const trimmed = value.trim();
    return trimmed === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(trimmed)
      ? undefined
      : message;
  };

/** Runs the rules in order and reports the first one that fails. */
export const compose =
  (...rules: Validator[]): Validator =>
  (field) => {
    let message: string | undefined;
    for (const rule of rules) {
      message = rule(field);
      if (message !== undefined) break;
    }
    return message;
  };
