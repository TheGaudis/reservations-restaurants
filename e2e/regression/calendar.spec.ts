import { test } from "../fixtures";

// Calendars (09 § 3: P-01, P-01b, P-02, P-02b).
// Scenarios of parite.md § 3, declared with their tags; each session replaces `test.fixme` with the scenario.

test.fixme(
  "calendarWeekNavigation (REG-09)",
  { tag: ["@changed:E-05", "@changed:E-06", "@P-01", "@P-01b", "@p4"] },
  () => {
    // Written in P1 (b).
  },
);

test.fixme(
  "calendarMonthView (REG-10)",
  { tag: ["@changed:E-23", "@P-02", "@P-02b", "@p4"] },
  () => {
    // Written in P1 (b).
  },
);

test.fixme("calendarKeyboard (REG-11)", { tag: ["@changed:E-07", "@P-01", "@P-02", "@p4"] }, () => {
  // Written in P1 (b).
});

test.fixme(
  "calendarDayAriaLabels (REG-12)",
  { tag: ["@changed:E-21", "@changed:E-43", "@P-01", "@P-02b", "@P-15", "@p4"] },
  () => {
    // Written in P1 (b).
  },
);
