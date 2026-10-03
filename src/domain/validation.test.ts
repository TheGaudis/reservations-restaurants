import { describe, expect, it } from "vitest";

import {
  atLeast,
  atMost,
  compose,
  countValue,
  email,
  isEmail,
  nonNegativeAmount,
  nonNegativeInteger,
  parseAmount,
  parseCount,
  positiveAmount,
  positiveInteger,
  required,
  stepCount,
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
    ["nonNegativeInteger, blank", nonNegativeInteger("no"), "", undefined],
    ["nonNegativeInteger, 0", nonNegativeInteger("no"), "0", undefined],
    ["nonNegativeInteger, -1", nonNegativeInteger("no"), "-1", "no"],
    ["nonNegativeInteger, 2,5", nonNegativeInteger("no"), "2,5", "no"],
    ["atLeast 3, 2", atLeast(3, "no"), "2", "no"],
    ["atLeast 3, 3", atLeast(3, "no"), "3", undefined],
    ["atLeast 3, blank", atLeast(3, "no"), "", undefined],
    ["atLeast 3, x", atLeast(3, "no"), "x", undefined],
    ["atMost 2, 3", atMost(2, "no"), "3", "no"],
    ["atMost 2, 2", atMost(2, "no"), "2", undefined],
    ["atMost 2, blank", atMost(2, "no"), "", undefined],
    ["atMost 2, 1.5", atMost(2, "no"), "1.5", undefined],
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
    const rule = compose(
      required("blank"),
      positiveInteger("not positive"),
      atMost(20, "too many"),
    );
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

  it.each<{ raw: string; delta: number; min: number; max?: number; expected: string }>([
    { raw: "", delta: 1, min: 0, expected: "1" },
    { raw: " ", delta: -1, min: 0, expected: "0" },
    { raw: "2", delta: 1, min: 0, max: 5, expected: "3" },
    { raw: "2", delta: -1, min: 0, max: 5, expected: "1" },
    { raw: "0", delta: -1, min: 0, max: 5, expected: "0" },
    { raw: "5", delta: 1, min: 0, max: 5, expected: "5" },
    { raw: "9", delta: -1, min: 0, max: 5, expected: "5" },
    { raw: "-3", delta: 1, min: 0, expected: "0" },
    { raw: "abc", delta: 1, min: 0, max: 5, expected: "1" },
    { raw: "1.5", delta: -1, min: 0, expected: "0" },
  ])(
    "stepCount($raw, $delta, $min, $max) = $expected (D-17)",
    ({ raw, delta, min, max, expected }) => {
      expect(stepCount(raw, delta, min, max)).toBe(expected);
    },
  );
});
