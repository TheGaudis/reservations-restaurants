import { APPS_SCRIPT_URL, isConfigMissing, USE_MOCK_API } from "@/config";

// Inline script of the <head> (03 § 2.1, PLAN § 3.3.1 step 2): starts the first read with the etag of a local copy
// younger than 14 days, keeps the Response (not r.json()) and never rejects unhandled.
// Empty on the fake script, whose msw worker starts after this script and would miss the read (PLAN § 3.11),
// and without a valid script URL (G-05): fetch("") would read the page itself.
export const earlyFetchScript =
  USE_MOCK_API || isConfigMissing()
    ? ""
    : `(function(){try{var since="";var c=JSON.parse(localStorage.getItem("reservations-cache-v1")||"null");if(c&&c.etag&&Date.now()-c.savedAt<12096e5)since=c.etag;var r=fetch(${JSON.stringify(APPS_SCRIPT_URL)}+(since?"?since="+encodeURIComponent(since):""));r.catch(function(){});window.__EARLY_FETCH__={since:since,response:r,startedAt:performance.now()};}catch(e){}})();`;
