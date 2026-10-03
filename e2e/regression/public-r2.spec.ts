import { test } from "../fixtures";

// R2 card, order form, summary and 10:00 cut-off (09 § 3: P-10 to P-17).
// Scenarios of parite.md § 3, declared with their tags; each session replaces `test.fixme` with the scenario.

test.fixme(
  "r2DayCardStates (REG-21)",
  { tag: ["@changed:E-27", "@P-10", "@P-11", "@P-12", "@P-16", "@P-17", "@p4"] },
  () => {
    // Written in P1 (b).
  },
);

test.fixme(
  "r2OrderFormVoucherDay (REG-22)",
  { tag: ["@changed:E-34", "@changed:E-41", "@P-13", "@p4"] },
  () => {
    // Written in P1 (b).
  },
);

test.fixme(
  "r2OrderAdjustedAndEmail (REG-23)",
  { tag: ["@changed:E-14", "@changed:E-28", "@P-14", "@p4"] },
  () => {
    // Written in P1 (b).
  },
);

test.fixme("r2ConfirmedEmpty (REG-24)", { tag: ["@changed:E-11", "@P-13", "@p4"] }, () => {
  // Written in P1 (b).
});

test.fixme("r2CutoffAt10 (REG-25)", { tag: ["@changed:E-09", "@P-13", "@P-15", "@p4"] }, () => {
  // Written in P1 (b).
});

test.fixme("r2ParisTime (REG-26)", { tag: ["@changed:E-01", "@P-12", "@P-15", "@p4"] }, () => {
  // Written in P1 (b).
});
