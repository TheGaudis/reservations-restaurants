import { test } from "../fixtures";

// Loading, local copy, load errors and refresh (09 § 2: G-01 to G-05, G-04 under refresh).
// Scenarios of parite.md § 3, declared with their tags; each session replaces `test.fixme` with the scenario.

test.fixme(
  "shellSkeletonWithStoredTitles (REG-01)",
  { tag: ["@parity", "@G-01", "@G-04", "@p4"] },
  () => {
    // Written in P1 (b).
  },
);

test.fixme("localCacheFirstRender (REG-02)", { tag: ["@changed:E-47", "@G-02", "@p4"] }, () => {
  // Written in P1 (b).
});

test.fixme(
  "hedgedReadAndRetry (REG-03)",
  { tag: ["@parity", "@changed:E-45", "@G-01", "@p4"] },
  () => {
    // Written in P1 (b).
  },
);

test.fixme("loadErrorOnlineRetry (REG-04)", { tag: ["@parity", "@G-03", "@p4"] }, () => {
  // Written in P1 (b).
});

test.fixme(
  "loadErrorOfflineWithCopy (REG-05)",
  { tag: ["@parity", "@G-03", "@G-02", "@p4"] },
  () => {
    // Written in P1 (b).
  },
);

test.fixme("loadErrorNotReannounced (REG-06)", { tag: ["@changed:E-42", "@G-03", "@p4"] }, () => {
  // Written in P1 (b).
});

test.fixme(
  "configMissingBanner (REG-07)",
  { tag: ["@changed:E-29", "@G-05", "@p4", "@legacy-only"] },
  () => {
    // Written in P1 (b).
  },
);

test.fixme(
  "refreshContinuesUnderOpenForm (REG-08)",
  { tag: ["@changed:E-08", "@G-04", "@P-05", "@p4"] },
  () => {
    // Written in P1 (b).
  },
);
