import { http, HttpResponse } from "msw";
import type { HttpHandler } from "msw";

import type { FakeDb } from "@/mocks/fake-db";
import { createSeed, SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { createScript, doGet, doPost, LOCK_BUSY } from "@/mocks/script";

/**
 * Fake Apps Script shared by Vitest, Storybook, `pnpm dev` and the E2E suite (PLAN § 3.1, P1): one instance per
 * test or story. Semantics of Code.gs (`script.ts`, `public-actions.ts`, `staff-r1.ts`, `staff-r2.ts`), tables with
 * the script's field names (`fake-db.ts`). Isomorphic: neither DOM nor `node:*`.
 */

/** Every deployment id, the real one written in `legacy/index.html` included (R-33). */
export const APPS_SCRIPT_URL_PATTERN = "https://script.google.com/macros/s/:deploymentId/exec";

const GOOGLE_ERROR_PAGE = "Sorry, unable to open the file at this time.";
// 02 § 1.2: Apps Script answers with open CORS.
const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };

interface FakeRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
  /** Parsed body, or null when it is not JSON. */
  json: unknown;
}

/**
 * - `html`: Google's transient HTML error page, status 500, request not processed (02 § 1.6);
 * - `network`: request processed, then the connection drops: lost response (REG-19);
 * - `error`: `{ error: message }`, request not processed; default message: the lock one (02 § 1.7).
 */
type FailureKind = "html" | "network" | "error";

export interface FakeAppsScriptOptions {
  seed?: FakeDb;
  password?: string;
}

export interface FakeAppsScript {
  handlers: HttpHandler[];
  /** Live tables: a test reads them, or changes them to play another visitor. */
  db: FakeDb;
  /** Every request received, in order of arrival. */
  requests: FakeRequest[];
  /** Changes the staff password during a test (REG-31). */
  setPassword: (password: string) => void;
  /** Fails the next request; calls queue up, one per request. */
  failNext: (kind: FailureKind, message?: string) => void;
  /** Holds the next request until the returned function runs; calls queue up, one per request. */
  hold: () => () => void;
}

interface Failure {
  kind: FailureKind;
  message: string | undefined;
}

function json(body: object): Response {
  return HttpResponse.json(body, { headers: CORS_HEADERS });
}

function htmlErrorPage(message = GOOGLE_ERROR_PAGE): Response {
  const page = `<!DOCTYPE html><html><head><title>Google Apps Script</title></head><body>${message}</body></html>`;
  return new HttpResponse(page, {
    status: 500,
    headers: { "Content-Type": "text/html; charset=utf-8", ...CORS_HEADERS },
  });
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function createFakeAppsScript(options: FakeAppsScriptOptions = {}): FakeAppsScript {
  const script = createScript(options.seed ?? createSeed(), options.password ?? SEED_PASSWORD);
  const requests: FakeRequest[] = [];
  const failures: Failure[] = [];
  const holds: Array<Promise<void>> = [];

  async function answer(request: Request, compute: (text: string) => object): Promise<Response> {
    const text = await request.text();
    const { method, url, headers } = request;
    requests.push({
      method,
      url,
      headers: Object.fromEntries(headers),
      body: text,
      json: parseJson(text),
    });
    const held = holds.shift();
    const failure = failures.shift();
    if (held !== undefined) {
      await held;
    }
    if (failure?.kind === "html") {
      return htmlErrorPage(failure.message);
    }
    if (failure?.kind === "error") {
      return json({ error: failure.message ?? LOCK_BUSY });
    }
    const result = compute(text);
    return failure?.kind === "network" ? HttpResponse.error() : json(result);
  }

  return {
    handlers: [
      http.get(APPS_SCRIPT_URL_PATTERN, async ({ request }) =>
        answer(request, () => doGet(script, request.url)),
      ),
      http.post(APPS_SCRIPT_URL_PATTERN, async ({ request }) =>
        answer(request, (text) => doPost(script, text)),
      ),
    ],
    db: script.db,
    requests,
    setPassword: script.setPassword,
    failNext: (kind, message) => {
      failures.push({ kind, message });
    },
    hold: () => {
      const gate: { open?: () => void } = {};
      holds.push(
        new Promise<void>((resolve) => {
          gate.open = resolve;
        }),
      );
      return () => gate.open?.();
    },
  };
}
