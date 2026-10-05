import * as v from "valibot";

import { scriptError, ServiceError } from "@/api/errors";
import { APPS_SCRIPT_URL } from "@/config";

// HTTP exchanges with the script (02 § 1). No header on a GET, `Content-Type: text/plain;charset=utf-8` and
// nothing else on a POST: any other header triggers a CORS preflight that Apps Script does not answer (R-07).
// `redirect` and `credentials` keep their defaults: fetch follows the 302 to script.googleusercontent.com (R-08).

/**
 * Public read URL, with the etag of the displayed state when there is one (`stateUrl`, 02 § 1.2, § 5.1).
 * @internal exported for its tests only (knip --production)
 */
export function stateUrl(since: string): string {
  return since === "" ? APPS_SCRIPT_URL : `${APPS_SCRIPT_URL}?since=${encodeURIComponent(since)}`;
}

/**
 * JSON of a pending fetch. A rejected fetch (network, CORS of a Google error page, abort, timeout), a non-2xx
 * status or a body that is not JSON (HTML page) become a `ServiceError` (02 § 1.6, R-09).
 */
export async function readJson(pending: Promise<Response>): Promise<unknown> {
  let response: Response;
  try {
    response = await pending;
  } catch (error) {
    throw new ServiceError("No answer from the script.", { cause: error });
  }
  if (!response.ok) throw new ServiceError(`HTTP ${String(response.status)} from the script.`);
  try {
    return await response.json();
  } catch (error) {
    throw new ServiceError("The script did not answer JSON.", { cause: error });
  }
}

/** Throws the `{ error }` of a script answer (02 § 1.4), returns any other answer unchanged. */
export function rejectScriptError(json: unknown): unknown {
  const error = scriptError(json);
  if (error !== null) throw error;
  return json;
}

/** One public read: `GET` without header (02 § 1.2). The answer may still be `{ error }`. */
export async function getState(since: string, signal: AbortSignal): Promise<unknown> {
  return readJson(fetch(stateUrl(since), { signal }));
}

/**
 * One POST action (02 § 1.3): body `{ action, ...payload }`. Never retried nor doubled by this module; the
 * `{ error }` of the script is thrown as a `BusinessError` (02 § 4.1).
 */
export async function postAction(
  action: string,
  payload: Readonly<Record<string, unknown>>,
  { signal }: { signal?: AbortSignal } = {},
): Promise<unknown> {
  const json = await readJson(
    fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...payload }),
      ...(signal === undefined ? {} : { signal }),
    }),
  );
  return rejectScriptError(json);
}

/** Validates and translates an answer with a schema of schemas.ts; a refused shape is a `ServiceError` (R-09). */
export function parseAnswer<S extends v.GenericSchema>(schema: S, json: unknown): v.InferOutput<S> {
  const result = v.safeParse(schema, json);
  if (!result.success) {
    throw new ServiceError("Unexpected answer from the script.", {
      cause: v.flatten(result.issues),
    });
  }
  return result.output;
}
