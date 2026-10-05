import type { MessageDescriptor } from "react-intl";
import { expect, it } from "vitest";

import { commonMessages } from "@/intl/common-messages";
import { intl } from "@/intl/intl";

it.each([
  [12.5, "12,50 €"],
  [4.95, "4,95 €"],
  [0, "0,00 €"],
])("formats %d as %s with the euro format (00 § 3)", (amount, expected) => {
  expect(intl.formatNumber(amount, { format: "euro" })).toBe(expected);
});

it("formats a shared message", () => {
  expect(intl.formatMessage(commonMessages.cancel)).toBe("Annuler");
});

it("types message ids from translations/fr.json", () => {
  const known: MessageDescriptor = { id: "common.action.cancel" };
  // @ts-expect-error: an id missing from translations/fr.json does not compile (src/intl/types.d.ts)
  const unknown: MessageDescriptor = { id: "common.action.unknown" };
  expect([known.id, unknown.id]).toStrictEqual(["common.action.cancel", "common.action.unknown"]);
});
