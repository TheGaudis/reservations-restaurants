/**
 * Reference instant of every test, story and E2E scenario (PLAN P1, parite.md § 1): Monday 5 October 2026,
 * 9:30 in Paris. Tests never read the real clock.
 */
export const TEST_NOW = Date.parse("2026-10-05T07:30:00.000Z");

/** Paris date of `TEST_NOW`; the seed of the fake script is dated from it. */
export const TODAY = "2026-10-05";
