// Client constants of 00 § 2.1, plus the delays the plan adds (E-45, D-15). Durations in milliseconds.

/** A local copy older than this is ignored (`CACHE_MAX_AGE`, 00 § 2.1): 14 days. */
export const LOCAL_CACHE_MAX_AGE_MS = 14 * 24 * 3600 * 1000;

/** Second, identical read when the first one has not answered (`HEDGE_MS`, 00 § 2.1, 02 § 1.5). */
export const HEDGE_DELAY_MS = 6000;

/** Delay before the single new attempt of a failed read (00 § 2.1, 02 § 1.5). */
export const READ_RETRY_DELAY_MS = 1500;

/** Each read attempt is abandoned after this delay (E-45, a-2). */
export const READ_TIMEOUT_MS = 30_000;

/** Automatic refresh of the displayed state (00 § 2.1, 03 § 5.1): 3 minutes. */
export const REFRESH_INTERVAL_MS = 180_000;

/** Paris hour from which R2 online orders are closed for the day (`R2_CUTOFF_HOUR`, 01 § 3.7). */
export const R2_CUTOFF_HOUR = 10;

/** Paris hour from which R2 takes orders on site (`R2_ONSITE_HOUR`, 01 § 3.7). */
export const R2_ONSITE_HOUR = 12;

/** "Almost full" when fewer than half the seats or portions remain (01 § 3.3). */
export const ALMOST_FULL_RATIO = 0.5;

/** Second click of a two-click deletion accepted during this window (00 § 2.1, 06 § 5.2). */
export const CONFIRM_WINDOW_MS = 4000;

/** Display time of a toast (00 § 2.1). */
export const TOAST_DURATION_MS = 3500;

/** Staff session closed after this inactivity (`INACTIVITY_MS`, 06 § 1.6): 10 minutes. */
export const INACTIVITY_MS = 600_000;

/** Slow-write notice under the busy button (D-15). */
export const SLOW_WRITE_MS = 20_000;

/** Printing waits at most this long for the fonts (07 § 8). */
export const PRINT_FONTS_TIMEOUT_MS = 2000;

/** Easter egg: this many clicks on the logo (00 § 2.1, D-01)… */
export const LOGO_CLICKS = 5;

/** …within this window. */
export const LOGO_CLICK_WINDOW_MS = 2000;
