import { test } from "../fixtures";

// R1 card, booking form and summary (09 § 3: P-03 to P-08).
// Scenarios of parite.md § 3, declared with their tags; each session replaces `test.fixme` with the scenario.

test.fixme(
  "columnsIndependent (REG-13)",
  { tag: ["@changed:E-32", "@changed:E-31", "@P-05", "@P-06", "@P-13", "@p4"] },
  () => {
    // Written in P1 (b).
  },
);

test.fixme(
  "r1DayCardStates (REG-14)",
  { tag: ["@changed:E-27", "@changed:E-21", "@P-03", "@P-04", "@P-07", "@P-08", "@p4"] },
  () => {
    // Written in P1 (b).
  },
);

test.fixme(
  "r1FormValidation (REG-15)",
  {
    tag: [
      "@changed:E-03",
      "@changed:E-19",
      "@changed:E-34",
      "@changed:E-46",
      "@changed:E-28",
      "@P-05",
      "@p4",
    ],
  },
  () => {
    // Written in P1 (b).
  },
);

test.fixme("r1MaxSeats (REG-16)", { tag: ["@changed:E-35", "@P-05", "@p4"] }, () => {
  // Written in P1 (b).
});

test.fixme(
  "r1BookingSuccess (REG-17)",
  { tag: ["@changed:E-12", "@changed:E-13", "@P-05", "@P-06", "@p4"] },
  () => {
    // Written in P1 (b).
  },
);

test.fixme("r1RetryKeepsRequestId (REG-18)", { tag: ["@parity", "@P-05", "@p4"] }, () => {
  // Written in P1 (b).
});

test.fixme(
  "duplicateAfterLostResponse (REG-19)",
  { tag: ["@changed:E-10", "@changed:E-33", "@P-06", "@p4"] },
  () => {
    // Written in P1 (b).
  },
);

test.fixme("slowWriteNeverReplayed (REG-20)", { tag: ["@changed:E-10", "@P-05", "@p4"] }, () => {
  // Written in P1 (b).
});
