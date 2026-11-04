import { expect, it } from "vitest";

import { APPS_SCRIPT_URL, isConfigMissing, USE_MOCK_API } from "@/config";

it.each([
  ["https://script.google.com/macros/s/AKfycbx-1_2/exec", false],
  ["https://script.google.com/macros/s/COLLE_ICI/exec", true],
  ["", true],
  ["https://example.com/macros/s/abc/exec", true],
  ["https://script.google.com/macros/s/abc/dev", true],
])("isConfigMissing(%j) is %s (G-05, a-25)", (url, missing) => {
  expect(isConfigMissing(url)).toBe(missing);
});

it("reads the fake URL of .env.test", () => {
  expect(APPS_SCRIPT_URL).toBe("https://script.google.com/macros/s/FAKE/exec");
  expect(isConfigMissing()).toBe(false);
});

it("keeps the fake script worker off under .env.test", () => {
  expect(USE_MOCK_API).toBe(false);
});
