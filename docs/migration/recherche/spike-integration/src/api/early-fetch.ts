import { APPS_SCRIPT_URL } from "@/config";

/** Inline script run before the bundle (ScriptOnce): starts the first read with the cached etag. */
export const earlyFetchScript = `(function(){try{var since="";var c=JSON.parse(localStorage.getItem("reservations-cache-v1")||"null");if(c&&c.etag&&Date.now()-c.savedAt<12096e5)since=c.etag;var u=${JSON.stringify(APPS_SCRIPT_URL)}+(since?"?since="+encodeURIComponent(since):"");var r=fetch(u);r.catch(function(){});window.__EARLY_FETCH__={since:since,response:r,startedAt:performance.now()};}catch(e){}})();`;
