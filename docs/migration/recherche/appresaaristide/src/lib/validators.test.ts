import { describe, expect, test } from "vitest";
import {
  atLeast,
  atMost,
  compose,
  email,
  nonNegativeAmount,
  nonNegativeInteger,
  positiveInteger,
  required,
} from "./validators";

const check = (rule: (field: { value: string }) => unknown, value: string) =>
  rule({ value });

describe("validators", () => {
  test("required rejects blank values", () => {
    const rule = required("vide");
    expect(check(rule, "  ")).toBe("vide");
    expect(check(rule, " a ")).toBeUndefined();
  });

  test("positiveInteger accepts integers from 1, and blank", () => {
    const rule = positiveInteger("non");
    expect(check(rule, "")).toBeUndefined();
    expect(check(rule, "3")).toBeUndefined();
    expect(check(rule, "0")).toBe("non");
    expect(check(rule, "1.5")).toBe("non");
    expect(check(rule, "abc")).toBe("non");
  });

  test("nonNegativeInteger accepts 0 and blank", () => {
    const rule = nonNegativeInteger("non");
    expect(check(rule, "")).toBeUndefined();
    expect(check(rule, "0")).toBeUndefined();
    expect(check(rule, "-1")).toBe("non");
    expect(check(rule, "2,5")).toBe("non");
  });

  test("atLeast and atMost bound integers only", () => {
    expect(check(atLeast(3, "petit"), "2")).toBe("petit");
    expect(check(atLeast(3, "petit"), "3")).toBeUndefined();
    expect(check(atLeast(3, "petit"), "")).toBeUndefined();
    expect(check(atLeast(3, "petit"), "x")).toBeUndefined();
    expect(check(atMost(2, "grand"), "3")).toBe("grand");
    expect(check(atMost(2, "grand"), "2")).toBeUndefined();
    expect(check(atMost(2, "grand"), "")).toBeUndefined();
    expect(check(atMost(2, "grand"), "1.5")).toBeUndefined();
  });

  test("nonNegativeAmount accepts a comma", () => {
    const rule = nonNegativeAmount("non");
    expect(check(rule, "")).toBeUndefined();
    expect(check(rule, "4,95")).toBeUndefined();
    expect(check(rule, "0")).toBeUndefined();
    expect(check(rule, "3.55")).toBeUndefined();
    expect(check(rule, "3.555")).toBe("non");
    expect(check(rule, "-1")).toBe("non");
    expect(check(rule, "quatre")).toBe("non");
  });

  test("email checks the shape of an address", () => {
    const rule = email("non");
    expect(check(rule, "")).toBeUndefined();
    expect(check(rule, " prof@lycee.fr ")).toBeUndefined();
    expect(check(rule, "prof@lycee")).toBe("non");
    expect(check(rule, "prof lycee.fr")).toBe("non");
  });

  test("compose reports the first failing rule", () => {
    const rule = compose(required("vide"), email("non"));
    expect(check(rule, "")).toBe("vide");
    expect(check(rule, "x")).toBe("non");
    expect(check(rule, "a@b.fr")).toBeUndefined();
  });
});
