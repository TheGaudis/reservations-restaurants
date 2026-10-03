import { expect, it } from "vitest";

import { newRequestId } from "@/api/request-id";

it("draws a new UUID at each call (02 § 5.3)", () => {
  const first = newRequestId();
  expect(first).toMatch(/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[\da-f]{4}-[\da-f]{12}$/u);
  expect(newRequestId()).not.toBe(first);
});

it("falls back on the old site's identifier without crypto.randomUUID (Safari < 15.4, R-22)", () => {
  const id = newRequestId({});
  expect(id).toMatch(/^[\da-z]+-[\da-z]+$/u);
  expect(newRequestId({})).not.toBe(id);
});
