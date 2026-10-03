import { takeEarlyFetch } from "@/api/early-fetch";
import { BusinessError } from "@/api/errors";
import { hedgedRead } from "@/api/hedged-read";
import { ReadResponseSchema } from "@/api/schemas";
import type { ReadResponse } from "@/api/schemas";
import { abortable } from "@/api/signals";
import { FullStateSchema } from "@/api/staff-schemas";
import { getState, parseAnswer, postAction, readJson, rejectScriptError } from "@/api/transport";
import type { FullState } from "@/domain/types";

/**
 * Public read (02 § 1.5, § 3, 03 § 2.4): takes the early fetch when it was sent with the same `since`, otherwise
 * reads anew; hedged at 6 s, 30 s per attempt. `{ error }` is a `BusinessError`, never retried.
 */
export async function fetchPublicState({
  since,
  signal,
}: {
  since: string;
  signal?: AbortSignal;
}): Promise<ReadResponse> {
  const early = takeEarlyFetch(since);
  const json = await hedgedRead(async (attemptSignal) => getState(since, attemptSignal), {
    signal,
    first: early && {
      attempt: async (attemptSignal) => readJson(abortable(early.response, attemptSignal)),
      elapsedMs: performance.now() - early.startedAt,
    },
  });
  return parseAnswer(ReadResponseSchema, rejectScriptError(json));
}

/**
 * Full state of the staff mode: `getAdminState` with the password in the body, never in the URL (02 § 2, § 4.3).
 * A POST: neither hedged nor capped (02 § 1.5); `signal` lets TanStack Query cancel it.
 */
export async function fetchFullState(password: string, signal?: AbortSignal): Promise<FullState> {
  const json = await postAction(
    "getAdminState",
    { password },
    signal === undefined ? {} : { signal },
  );
  return parseAnswer(FullStateSchema, json);
}

/**
 * `retry` of the reads (PLAN § 3.3, 02 § 1.5): one new attempt, not for an answer of the script (`{ error }`),
 * not offline. TanStack Query waits `READ_RETRY_DELAY_MS` before it.
 */
export function retryRead(failureCount: number, error: unknown): boolean {
  return failureCount < 1 && !(error instanceof BusinessError) && navigator.onLine;
}
