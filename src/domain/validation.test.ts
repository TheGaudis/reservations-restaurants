import { describe, expect, it } from "vitest";

import {
  compose,
  countValue,
  email,
  isEmail,
  nonNegativeAmount,
  parseAmount,
  parseCount,
  positiveAmount,
  positiveInteger,
  required,
} from "@/domain/validation";
import type { Validator } from "@/domain/validation";

const check = (rule: Validator<string>, value: string) => rule({ value });

describe("e-mail (00 § 3, 04 § 5.2)", () => {
  // emailError: three cases, messages chosen by the form.
  const contact = compose(required("missing"), email("invalid"));

  it.each([
    ["c.ungerer@exemple.fr", undefined],
    ["  prof@lycee.fr  ", undefined],
    ["", "missing"],
    ["   ", "missing"],
    ["prof@lycee", "invalid"],
    ["prof lycee.fr", "invalid"],
    ["prof@ly cee.fr", "invalid"],
    ["@lycee.fr", "invalid"],
  ])("%j: %s", (value, expected) => {
    expect(check(contact, value)).toBe(expected);
    expect(isEmail(value)).toBe(expected === undefined);
  });

  it("lets an empty optional address through (06 § 8.1)", () => {
    expect(check(email("invalid"), "")).toBeUndefined();
    expect(check(email("invalid"), "06 12 34 56 78")).toBe("invalid");
  });
});

describe("text rules (validators of AppResaAristide)", () => {
  it.each<[string, Validator<string>, string, string | undefined]>([
    ["required, blank", required("no"), "  ", "no"],
    ["required, text", required("no"), " a ", undefined],
    ["positiveInteger, blank", positiveInteger("no"), "", undefined],
    ["positiveInteger, 3", positiveInteger("no"), "3", undefined],
    ["positiveInteger, 0", positiveInteger("no"), "0", "no"],
    ["positiveInteger, 1.5", positiveInteger("no"), "1.5", "no"],
    ["positiveInteger, abc", positiveInteger("no"), "abc", "no"],
    ["nonNegativeAmount, blank", nonNegativeAmount("no"), "", undefined],
    ["nonNegativeAmount, 4,95", nonNegativeAmount("no"), "4,95", undefined],
    ["nonNegativeAmount, 0", nonNegativeAmount("no"), "0", undefined],
    ["nonNegativeAmount, 3.55", nonNegativeAmount("no"), "3.55", undefined],
    ["nonNegativeAmount, 3.555", nonNegativeAmount("no"), "3.555", "no"],
    ["nonNegativeAmount, -1", nonNegativeAmount("no"), "-1", "no"],
    ["nonNegativeAmount, quatre", nonNegativeAmount("no"), "quatre", "no"],
    ["positiveAmount, blank (no price)", positiveAmount("no"), " ", undefined],
    ["positiveAmount, 3,50", positiveAmount("no"), "3,50", undefined],
    ["positiveAmount, 0 (D-22)", positiveAmount("no"), "0", "no"],
    ["positiveAmount, 0,00 (D-22)", positiveAmount("no"), "0,00", "no"],
    ["positiveAmount, 1.234", positiveAmount("no"), "1.234", "no"],
    ["positiveAmount, abc", positiveAmount("no"), "abc", "no"],
  ])("%s", (_case, rule, value, expected) => {
    expect(check(rule, value)).toBe(expected);
  });

  it("reports the first failing rule", () => {
    const atMost20: Validator<string> = ({ value }) =>
      Number(value) > 20 ? "too many" : undefined;
    const rule = compose(required("blank"), positiveInteger("not positive"), atMost20);
    expect(check(rule, "")).toBe("blank");
    expect(check(rule, "0")).toBe("not positive");
    expect(check(rule, "21")).toBe("too many");
    expect(check(rule, "20")).toBeUndefined();
  });

  it("passes any message type through", () => {
    expect(required({ id: "x" })({ value: "" })).toStrictEqual({ id: "x" });
  });
});

describe("number parsing (money.ts of AppResaAristide)", () => {
  it.each([
    ["4,95", 4.95],
    [" 4.95 ", 4.95],
    ["0", 0],
    ["", undefined],
    ["  ", undefined],
    ["quatre", Number.NaN],
    ["Infinity", Number.NaN],
  ])("parseAmount(%j) = %s", (raw, expected) => {
    expect(parseAmount(raw)).toBe(expected);
  });

  it.each([
    ["", 0],
    [" 3 ", 3],
    ["-2", -2],
    ["2.7", Number.NaN],
    ["abc", Number.NaN],
  ])("parseCount(%j) = %s (E-19)", (raw, expected) => {
    expect(parseCount(raw)).toBe(expected);
  });

  it.each([
    [null, 0],
    [0, 0],
    [3, 3],
  ])("an empty number field counts 0: %s → %i", (value, expected) => {
    expect(countValue(value)).toBe(expected);
  });
});
