import { test } from "../fixtures";

// Staff mode (09 § 2: G-06, G-08; 09 § 3: L-01; 09 § 4: C-02 to C-30).
// Scenarios of parite.md § 3, declared with their tags; each session replaces `test.fixme` with the scenario.

test.fixme(
  "loginPanel (REG-27)",
  {
    tag: [
      "@changed:E-04",
      "@changed:E-02",
      "@changed:E-23",
      "@L-01",
      "@G-02",
      "@G-06",
      "@G-08",
      "@p5",
    ],
  },
  () => {
    // Written in P1 (c).
  },
);

test.fixme("staffGuardReload (REG-28)", { tag: ["@changed:E-23", "@G-08", "@p5"] }, () => {
  // Written in P1 (c).
});

test.fixme(
  "logoutPurgeAndPanels (REG-29)",
  { tag: ["@changed:E-24", "@changed:E-17", "@changed:E-08", "@C-30", "@C-02", "@C-05", "@p5"] },
  () => {
    // Written in P1 (c).
  },
);

test.fixme(
  "inactivityLogoutJourney (REG-30)",
  { tag: ["@parity", "@C-04", "@C-12", "@C-30", "@p5"] },
  () => {
    // Written in P1 (c).
  },
);

test.fixme("passwordChanged (REG-31)", { tag: ["@parity", "@C-30", "@p5"] }, () => {
  // Written in P1 (c).
});

test.fixme(
  "settingsPanel (REG-32)",
  { tag: ["@parity", "@changed:E-18", "@changed:E-37", "@changed:E-40", "@C-02", "@p5"] },
  () => {
    // Written in P1 (c).
  },
);

test.fixme(
  "openDayR1WithPicker (REG-33)",
  { tag: ["@parity", "@changed:E-36", "@C-04", "@C-05", "@C-10", "@p5"] },
  () => {
    // Written in P1 (c).
  },
);

test.fixme(
  "openDayR2DishLines (REG-34)",
  { tag: ["@changed:E-36", "@changed:E-39", "@C-06", "@p5"] },
  () => {
    // Written in P1 (c).
  },
);

test.fixme(
  "r1StaffCard (REG-35)",
  {
    tag: [
      "@parity",
      "@changed:E-04",
      "@changed:E-38",
      "@changed:E-48",
      "@C-10",
      "@C-10b",
      "@C-11",
      "@C-13",
      "@C-14",
      "@G-06",
      "@p5",
    ],
  },
  () => {
    // Written in P1 (c).
  },
);

test.fixme("r1StaffAddPerson (REG-36)", { tag: ["@parity", "@C-12", "@p5"] }, () => {
  // Written in P1 (c).
});

test.fixme(
  "r2StaffCardDishes (REG-37)",
  { tag: ["@changed:E-36", "@changed:E-38", "@C-20", "@C-21", "@C-22", "@C-14", "@p5"] },
  () => {
    // Written in P1 (c).
  },
);

test.fixme(
  "r2StaffBookings (REG-38)",
  { tag: ["@parity", "@changed:E-36", "@C-23", "@C-24", "@p5"] },
  () => {
    // Written in P1 (c).
  },
);
