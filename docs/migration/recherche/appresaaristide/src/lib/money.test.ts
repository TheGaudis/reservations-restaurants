import { describe, expect, test } from "vitest";
import { stepCount } from "./money";

describe("stepCount", () => {
  test("counts an empty field as 0", () => {
    expect(stepCount("", 1, 0)).toBe("1");
    expect(stepCount(" ", -1, 0)).toBe("0");
  });

  test("steps within the bounds", () => {
    expect(stepCount("2", 1, 0, 5)).toBe("3");
    expect(stepCount("2", -1, 0, 5)).toBe("1");
  });

  test("never goes below min or above max", () => {
    expect(stepCount("0", -1, 0, 5)).toBe("0");
    expect(stepCount("5", 1, 0, 5)).toBe("5");
    expect(stepCount("9", -1, 0, 5)).toBe("5");
    expect(stepCount("-3", 1, 0)).toBe("0");
  });

  test("starts from min when the value is not a count", () => {
    expect(stepCount("abc", 1, 0, 5)).toBe("1");
    expect(stepCount("1.5", -1, 0)).toBe("0");
  });
});
