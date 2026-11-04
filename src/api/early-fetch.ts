import { APPS_SCRIPT_URL, isConfigMissing, USE_MOCK_API } from "@/config";
import { LOCAL_CACHE_KEY, LOCAL_CACHE_MAX_AGE_MS } from "@/domain/constants";

/** Read started by the inline script of the `<head>` (03 § 2.1, PLAN § 3.3.1 step 2). */
interface EarlyFetch {
  /** Etag sent as `since`, `""` without a valid local copy. */
  since: string;
  /** The `Response`, not its JSON: the reader applies the error handling of every other read. */
  response: Promise<Response>;
  /** `performance.now()` at the start: the hedge waits only for the rest of its 6 s (02 § 1.5). */
  startedAt: number;
}

declare global {
  // Written by `earlyFetchScript`, taken once by `takeEarlyFetch`.
  var __EARLY_FETCH__: EarlyFetch | undefined;
}

/**
 * Text of the inline script of the `<head>` (03 § 2.1, PLAN § 3.3.1 step 2): starts the first read with the
 * etag of a local copy younger than 14 days, keeps the Response and never rejects unhandled.
 * Empty on the fake script, whose msw worker starts after this script and would miss the read (PLAN § 3.11),
 * and without a valid script URL (G-05): fetch("") would read the page itself.
 */
export const earlyFetchScript =
  USE_MOCK_API || isConfigMissing()
    ? ""
    : `(function(){try{var since="";try{var c=JSON.parse(localStorage.getItem(${JSON.stringify(LOCAL_CACHE_KEY)})||"null");if(c&&c.etag&&Date.now()-c.savedAt<${String(LOCAL_CACHE_MAX_AGE_MS)})since=c.etag;}catch(e){}var r=fetch(${JSON.stringify(APPS_SCRIPT_URL)}+(since?"?since="+encodeURIComponent(since):""));r.catch(function(){});window.__EARLY_FETCH__={since:since,response:r,startedAt:performance.now()};}catch(e){}})();`;

/**
 * The early fetch, once: the first call takes it whatever its `since`, and returns it only when it was sent with
 * the same `since` (`apiGet`, 02 § 1.5, 03 § 2.4); otherwise the read starts anew.
 */
export function takeEarlyFetch(since: string): EarlyFetch | null {
  const early = globalThis.__EARLY_FETCH__;
  globalThis.__EARLY_FETCH__ = undefined;
  return early?.since === since ? early : null;
}
