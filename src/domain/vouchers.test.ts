import { describe, expect, it } from "vitest";

import type { ServiceMode } from "@/domain/types";
import {
  dayHasVoucher,
  hasVoucherMark,
  plainName,
  serviceMode,
  VOUCHER_MARK,
  VOUCHER_MARK_RE,
  withVoucherMark,
} from "@/domain/vouchers";

describe("voucher mark (01 § 3.5)", () => {
  it.each([
    ["Bowl (ticket restaurant)", "Bowl", true],
    ["Bowl", "Bowl", false],
    ["Bowl  (Ticket Restaurant)  ", "Bowl", true],
    ["Bowl(ticket restaurant)", "Bowl", true],
    ["Ticket restaurant", "Ticket restaurant", false],
    ["(ticket restaurant) Bowl", "(ticket restaurant) Bowl", false],
    ["", "", false],
  ])("reads %j as %j, voucher %s", (received, name, voucher) => {
    expect(plainName(received)).toBe(name);
    expect(hasVoucherMark(received)).toBe(voucher);
  });

  it.each([
    ["Bowl", true, "Bowl (ticket restaurant)"],
    ["Bowl", false, "Bowl"],
    ["Bowl (ticket restaurant)", true, "Bowl (ticket restaurant)"],
    ["Bowl (ticket restaurant)", false, "Bowl"],
  ])("sends %j with voucher %s as %j", (name, voucher, sent) => {
    expect(withVoucherMark(name, voucher)).toBe(sent);
  });

  it("starts the mark with a normal space and matches it at the end of a name only (00 § 2.1)", () => {
    expect(VOUCHER_MARK).toBe(" (ticket restaurant)");
    expect(VOUCHER_MARK_RE.test(`Bowl${VOUCHER_MARK}`)).toBe(true);
    expect(VOUCHER_MARK_RE.test(`${VOUCHER_MARK} Bowl`)).toBe(false);
  });

  it.each(["Bowl", "Bowl (ticket restaurant)", "Wrap  (TICKET RESTAURANT) "])(
    "reads and writes %j idempotently",
    (name) => {
      expect(plainName(plainName(name))).toBe(plainName(name));
      const sent = withVoucherMark(name, true);
      expect(withVoucherMark(sent, true)).toBe(sent);
      expect(plainName(sent)).toBe(plainName(name));
      expect(hasVoucherMark(sent)).toBe(true);
    },
  );
});

describe("service mode (01 § 3.6, invariant 5)", () => {
  const lasagnes = { voucher: false };
  const bowl = { voucher: true };

  it.each<{
    dishes: Array<{ voucher: boolean }>;
    chosen: ServiceMode;
    voucherDay: boolean;
    mode: ServiceMode;
  }>([
    { dishes: [], chosen: "takeaway", voucherDay: false, mode: "takeaway" },
    { dishes: [lasagnes], chosen: "takeaway", voucherDay: false, mode: "takeaway" },
    { dishes: [lasagnes], chosen: "dineIn", voucherDay: false, mode: "dineIn" },
    { dishes: [lasagnes, bowl], chosen: "takeaway", voucherDay: true, mode: "dineIn" },
    { dishes: [bowl], chosen: "dineIn", voucherDay: true, mode: "dineIn" },
  ])(
    "$chosen chosen among $dishes.length dishes gives $mode",
    ({ dishes, chosen, voucherDay, mode }) => {
      expect(dayHasVoucher(dishes)).toBe(voucherDay);
      expect(serviceMode(dishes, chosen)).toBe(mode);
    },
  );
});
