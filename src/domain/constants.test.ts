import { expect, it } from "vitest";

import {
  ALMOST_FULL_RATIO,
  CONFIRM_WINDOW_MS,
  HEDGE_DELAY_MS,
  INACTIVITY_MS,
  LOCAL_CACHE_MAX_AGE_MS,
  LOGO_CLICK_WINDOW_MS,
  LOGO_CLICKS,
  R2_CUTOFF_HOUR,
  READ_RETRY_DELAY_MS,
  READ_TIMEOUT_MS,
  REFRESH_INTERVAL_MS,
  SLOW_WRITE_MS,
  TOAST_DURATION_MS,
} from "@/domain/constants";

it.each([
  ["CACHE_MAX_AGE, 00 § 2.1", LOCAL_CACHE_MAX_AGE_MS, 1_209_600_000],
  ["HEDGE_MS, 00 § 2.1", HEDGE_DELAY_MS, 6000],
  ["read retry, 00 § 2.1", READ_RETRY_DELAY_MS, 1500],
  ["read timeout, E-45", READ_TIMEOUT_MS, 30_000],
  ["refresh, 00 § 2.1", REFRESH_INTERVAL_MS, 180_000],
  ["R2_CUTOFF_HOUR, 01 § 3.7", R2_CUTOFF_HOUR, 10],
  ["almost full, 01 § 3.3", ALMOST_FULL_RATIO, 0.5],
  ["two-click window, 00 § 2.1", CONFIRM_WINDOW_MS, 4000],
  ["toast, 00 § 2.1", TOAST_DURATION_MS, 3500],
  ["INACTIVITY_MS, 06 § 1.6", INACTIVITY_MS, 600_000],
  ["slow write, D-15", SLOW_WRITE_MS, 20_000],
  ["logo clicks, 00 § 2.1", LOGO_CLICKS, 5],
  ["logo window, 00 § 2.1", LOGO_CLICK_WINDOW_MS, 2000],
])("keeps the value of the spec (%s)", (_source, value, expected) => {
  expect(value).toBe(expected);
});
