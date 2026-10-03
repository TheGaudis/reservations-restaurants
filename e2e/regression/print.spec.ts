import { test } from "../fixtures";

// Printed documents and the tomorrow panel (09 § 4: C-01, C-03; 09 § 5: I-00 to I-04).
// Scenarios of parite.md § 3, declared with their tags; each session replaces `test.fixme` with the scenario.

test.fixme(
  "tomorrowPanel (REG-39)",
  { tag: ["@changed:E-30", "@changed:E-44", "@C-01", "@C-03", "@p6"] },
  () => {
    // Written in P1 (d).
  },
);

test.fixme(
  "printR1List (REG-40)",
  { tag: ["@changed:E-15", "@changed:E-20", "@I-01", "@I-00", "@p6"] },
  () => {
    // Written in P1 (d).
  },
);

test.fixme("printR2List (REG-41)", { tag: ["@changed:E-16", "@I-02", "@p6"] }, () => {
  // Written in P1 (d).
});

test.fixme(
  "printTomorrowDocuments (REG-42)",
  { tag: ["@changed:E-16", "@changed:E-44", "@I-03", "@I-04", "@p6"] },
  () => {
    // Written in P1 (d).
  },
);
