import { afterEach, expect, it, vi } from "vitest";

import { PasswordRejectedError } from "@/api/errors";
import { toLocalCacheV1 } from "@/queries/local-cache";
import { publicStateOptions, staffStateOptions } from "@/queries/state";
import { getRouter } from "@/router";
import { useSessionStore } from "@/session/session";
import { publicState } from "@/test/domain-states";
import { fakeScriptPerTest } from "@/test/fake-script-server";

// getRouter() runs in Node when the shell is prerendered (R-02). The local copy below is valid: only the
// typeof window guard keeps it out of the query cache, the try/catch of the storage read does not.
const COPY = publicState({ etag: "ETAG" });

function stubStorage() {
  const json = JSON.stringify(toLocalCacheV1(COPY, Date.now()));
  const setItem = vi.fn<(key: string, value: string) => void>();
  vi.stubGlobal("localStorage", { getItem: () => json, setItem });
  return setItem;
}

const start = fakeScriptPerTest();
const initialSession = useSessionStore.getState();

afterEach(() => {
  vi.unstubAllGlobals();
  useSessionStore.setState(initialSession, true);
});

it("neither reads nor writes the local copy without window", () => {
  const setItem = stubStorage();
  const { queryClient } = getRouter().options.context;
  expect(queryClient.getQueryData(publicStateOptions.queryKey)).toBeUndefined();
  queryClient.setQueryData(publicStateOptions.queryKey, publicState({ etag: "NEW" }));
  expect(setItem).not.toHaveBeenCalled();
});

it("restores the local copy, then writes each new public state, when window exists", () => {
  const setItem = stubStorage();
  vi.stubGlobal("window", globalThis);
  const { queryClient } = getRouter().options.context;
  expect(queryClient.getQueryData(publicStateOptions.queryKey)).toStrictEqual(COPY);
  expect(setItem).not.toHaveBeenCalled();
  queryClient.setQueryData(publicStateOptions.queryKey, publicState({ etag: "NEW" }));
  expect(setItem).toHaveBeenCalledOnce();
});

it("keeps the default pendingMinMs of the router (PLAN arbitrage 16)", () => {
  expect(getRouter().options.defaultPendingMinMs).toBe(500);
});

it("puts the staff session store in the router context (PLAN § 3.4)", () => {
  expect(getRouter().options.context.session).toBe(useSessionStore);
});

it("closes the staff session when the script refuses its password (06 § 1.7)", async () => {
  start();
  useSessionStore.getState().open("ancien");
  const { queryClient } = getRouter().options.context;
  await expect(queryClient.query(staffStateOptions(1, "ancien"))).rejects.toBeInstanceOf(
    PasswordRejectedError,
  );
  expect(useSessionStore.getState()).toMatchObject({
    password: null,
    endReason: "password-changed",
  });
});
