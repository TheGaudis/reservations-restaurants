import * as v from "valibot";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BusinessError, PasswordRejectedError, ServiceError } from "@/api/errors";
import { PublicStateSchema } from "@/api/schemas";
import { getState, parseAnswer, postAction, readJson, stateUrl } from "@/api/transport";
import type { FakeAppsScript } from "@/mocks/apps-script";
import { exampleDb } from "@/mocks/fixtures/example-db";
import publicStateExample from "@/mocks/fixtures/public-state.json" with { type: "json" };
import { fakeScriptPerTest, SCRIPT_URL } from "@/test/fake-script-server";

const start = fakeScriptPerTest();
const signal = () => new AbortController().signal;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requests (02 § 1.2, § 1.3, R-07)", () => {
  it.each([
    ["", SCRIPT_URL],
    ["Xq3v0Gk1bWq9u2yYc5n3tA", `${SCRIPT_URL}?since=Xq3v0Gk1bWq9u2yYc5n3tA`],
    ["a+b/c=", `${SCRIPT_URL}?since=a%2Bb%2Fc%3D`],
  ])("reads with since %j at %s", (since, url) => {
    expect(stateUrl(since)).toBe(url);
  });

  // Node's fetch adds its own headers (accept, user-agent, host…), as a browser does: a request made by the
  // test without options gives the reference.
  async function runtimeHeaders(fakeScript: FakeAppsScript): Promise<Record<string, string>> {
    await fetch(SCRIPT_URL);
    return fakeScript.requests.at(-1)?.headers ?? {};
  }

  it("sends a GET without any header of its own", async () => {
    const fakeScript = start({ seed: exampleDb() });
    const runtime = await runtimeHeaders(fakeScript);
    expect(await getState("", signal())).toStrictEqual(publicStateExample);
    expect(fakeScript.requests).toHaveLength(2);
    expect(fakeScript.requests[1]).toMatchObject({ method: "GET", url: SCRIPT_URL });
    expect(fakeScript.requests[1]?.headers).toStrictEqual(runtime);
  });

  it("sends a POST in text/plain;charset=utf-8, with no other header, the action in the body", async () => {
    const fakeScript = start();
    const runtime = await runtimeHeaders(fakeScript);
    await postAction("getAdminState", { password: "secret" });
    expect(fakeScript.requests).toHaveLength(2);
    expect(fakeScript.requests[1]).toMatchObject({ method: "POST", url: SCRIPT_URL });
    const { "content-length": _length, ...headers } = fakeScript.requests[1]?.headers ?? {};
    expect(headers).toStrictEqual({ ...runtime, "content-type": "text/plain;charset=utf-8" });
    expect(fakeScript.requests[1]?.json).toStrictEqual({
      action: "getAdminState",
      password: "secret",
    });
  });
});

describe("failures (02 § 1.4, § 1.6, § 2, R-09)", () => {
  it("throws a PasswordRejectedError on « Mot de passe incorrect. »", async () => {
    start();
    const pending = postAction("getAdminState", { password: "faux" });
    await expect(pending).rejects.toThrow(PasswordRejectedError);
    await expect(pending).rejects.toThrow("Mot de passe incorrect.");
  });

  it("throws a BusinessError with the script's message on any other { error }", async () => {
    const fakeScript = start();
    fakeScript.failNext("error", "Ce jour n'existe plus.");
    const pending = postAction("addBookingR1", { date: "2026-10-05" });
    await expect(pending).rejects.toThrow(BusinessError);
    await expect(pending).rejects.not.toThrow(PasswordRejectedError);
    await expect(pending).rejects.toThrow("Ce jour n'existe plus.");
  });

  it("returns the { error } of a read as is: the read decides (02 § 1.5)", async () => {
    const fakeScript = start();
    fakeScript.failNext("error", "Erreur");
    expect(await getState("", signal())).toStrictEqual({ error: "Erreur" });
  });

  it.each(["html", "network"] as const)("throws a ServiceError on a %s failure", async (kind) => {
    const fakeScript = start();
    fakeScript.failNext(kind);
    await expect(getState("", signal())).rejects.toThrow(ServiceError);
    fakeScript.failNext(kind);
    await expect(postAction("getAdminState", { password: "secret" })).rejects.toThrow(ServiceError);
  });

  it("throws a ServiceError on the TypeError of fetch (Google error page without CORS)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const pending = getState("", signal());
    await expect(pending).rejects.toThrow(ServiceError);
    await expect(pending).rejects.toHaveProperty("cause", new TypeError("Failed to fetch"));
  });

  it("throws a ServiceError on a 200 answer that is not JSON", async () => {
    const page = new Response("<!DOCTYPE html><html></html>", { status: 200 });
    await expect(readJson(Promise.resolve(page))).rejects.toThrow(ServiceError);
  });

  it("throws a ServiceError on an answer the schema refuses", () => {
    expect(() => parseAnswer(PublicStateSchema, { etag: "E1" })).toThrow(ServiceError);
    expect(parseAnswer(PublicStateSchema, publicStateExample)).toStrictEqual(
      v.parse(PublicStateSchema, publicStateExample),
    );
  });
});
