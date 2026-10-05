import { useMutation } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "vitest-browser-react";

import { editDayR1 } from "@/api/actions";
import { BusinessError, PasswordRejectedError, ServiceError } from "@/api/errors";
import { fetchFullState } from "@/api/state";
import type { EditDayR1Input, FullState } from "@/domain/types";
import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { staffErrorText, staffWriteKey, staffWriteOptions } from "@/mutations/staff/write";
import { createQueryClient } from "@/queries/client";
import { purgeStaffSession } from "@/queries/purge";
import { stateKeys } from "@/queries/state";
import { useSessionStore } from "@/session/session";
import { fakeScript } from "@/test/browser-fake-script";
import { TODAY } from "@/test/clock";
import { publicState } from "@/test/domain-states";
import { TestProviders } from "@/test/providers";
import { toastManager } from "@/ui/feedback/toast";

// Factory of the staff writes and its session guard (PLAN § 3.3.3, F-02, E-55, S8), on the fake script.

afterEach(() => {
  vi.restoreAllMocks();
});

function wrapperOf(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <TestProviders queryClient={queryClient}>{children}</TestProviders>
  );
}

const EDIT: EditDayR1Input = { date: TODAY, capacity: 18, menu: "Menu", theme: "" };

/** Logged in as the login does it: the full state of the fake script under the next number, then the session. */
async function loggedIn(queryClient: QueryClient): Promise<number> {
  const id = useSessionStore.getState().id + 1;
  queryClient.setQueryData(stateKeys.staff(id), await fetchFullState(SEED_PASSWORD));
  queryClient.setQueryData(stateKeys.public(), publicState());
  useSessionStore.getState().open(SEED_PASSWORD);
  return id;
}

async function renderEditDay(queryClient: QueryClient) {
  const { result } = await renderHook(
    () =>
      useMutation(
        staffWriteOptions({
          domain: "days",
          action: "editR1",
          write: editDayR1,
          successToast: (variables: EditDayR1Input) => `Jour modifié : ${variables.date}`,
        }),
      ),
    { wrapper: wrapperOf(queryClient) },
  );
  return result;
}

function capacityOf(state: FullState | undefined): number | undefined {
  return state?.r1Days.find((day) => day.date === TODAY)?.capacity;
}

function toastTitles(add: { mock: { calls: unknown[][] } }): unknown[] {
  return add.mock.calls.map(([options]) => (options as { title: unknown }).title);
}

describe("staffWriteOptions (PLAN § 3.3.3)", () => {
  it("keys the write by domain and action, in the scope of the writes", () => {
    const options = staffWriteOptions({ domain: "days", action: "editR1", write: editDayR1 });
    expect(options.mutationKey).toStrictEqual(["write", "days", "editR1"]);
    expect(staffWriteKey("settings", "save")).toStrictEqual(["write", "settings", "save"]);
    expect(options.scope).toStrictEqual({ id: "write" });
  });

  it("sends the password of the store, adopts the full state and toasts", async () => {
    const add = vi.spyOn(toastManager, "add");
    const queryClient = createQueryClient();
    const id = await loggedIn(queryClient);
    const result = await renderEditDay(queryClient);
    const answer = await result.current.mutateAsync(EDIT);
    expect(answer.sessionIdAtCall).toBe(id);
    const bodies = fakeScript().requests.filter((request) => request.method === "POST");
    expect(bodies.at(-1)?.json).toStrictEqual({
      action: "editDayR1",
      password: SEED_PASSWORD,
      date: TODAY,
      capacity: 18,
      menu: "Menu",
      theme: "",
    });
    expect(capacityOf(queryClient.getQueryData<FullState>(stateKeys.staff(id)))).toBe(18);
    // The public state is marked stale, not read (02 § 4.7: the answer is the full state).
    expect(queryClient.getQueryState(stateKeys.public())?.isInvalidated).toBe(true);
    expect(fakeScript().requests.filter((request) => request.method === "GET")).toHaveLength(0);
    expect(toastTitles(add)).toStrictEqual([`Jour modifié : ${TODAY}`]);
  });

  it("writes nothing and shows nothing for an answer received after a logout (E-55, S8)", async () => {
    const add = vi.spyOn(toastManager, "add");
    const queryClient = createQueryClient();
    await loggedIn(queryClient);
    const result = await renderEditDay(queryClient);
    const release = fakeScript().hold();
    const sending = result.current.mutateAsync(EDIT);
    await expect.poll(() => fakeScript().requests.length).toBe(2);
    // Logout steps 1 and 2 (PLAN § 3.3.4).
    useSessionStore.getState().close("logout");
    purgeStaffSession(queryClient);
    release();
    await sending;
    // The script wrote it; the cache got nothing back, not even a staff entry.
    expect(capacityOf(await fetchFullState(SEED_PASSWORD))).toBe(18);
    expect(queryClient.getQueryCache().findAll({ queryKey: stateKeys.staffAll() })).toHaveLength(0);
    expect(add).not.toHaveBeenCalled();
  });

  it("discards an answer of a previous session once a new one is open", async () => {
    const queryClient = createQueryClient();
    const first = await loggedIn(queryClient);
    const result = await renderEditDay(queryClient);
    const release = fakeScript().hold();
    const sending = result.current.mutateAsync(EDIT);
    await expect.poll(() => fakeScript().requests.length).toBe(2);
    useSessionStore.getState().close("inactivity");
    purgeStaffSession(queryClient);
    const second = await loggedIn(queryClient);
    release();
    await sending;
    expect(second).toBe(first + 1);
    expect(queryClient.getQueryData(stateKeys.staff(first))).toBeUndefined();
    expect(capacityOf(queryClient.getQueryData<FullState>(stateKeys.staff(second)))).toBe(20);
  });

  it("refuses to send without an open session", async () => {
    const queryClient = createQueryClient();
    const result = await renderEditDay(queryClient);
    await expect(result.current.mutateAsync(EDIT)).rejects.toThrow("without an open staff session");
    expect(fakeScript().requests).toHaveLength(0);
  });

  it("closes the session when the script refuses the password (06 § 1.7)", async () => {
    const queryClient = createQueryClient({
      onPasswordRejected: () => {
        useSessionStore.getState().close("password-changed");
      },
    });
    await loggedIn(queryClient);
    fakeScript().setPassword("autre");
    const result = await renderEditDay(queryClient);
    await expect(result.current.mutateAsync(EDIT)).rejects.toThrow(PasswordRejectedError);
    expect(useSessionStore.getState()).toMatchObject({
      password: null,
      endReason: "password-changed",
    });
  });
});

describe("staffErrorText (02 § 4.7, D-14)", () => {
  it.each<[string, unknown, string | null]>([
    ["a message of the script, as is", new BusinessError("Plat introuvable."), "Plat introuvable."],
    [
      "a technical failure, with the staff text of D-14",
      new ServiceError("HTML page"),
      "Le service ne répond pas. Réessayez dans un instant.",
    ],
    [
      "a failure that is not an Error",
      "boom",
      "Le service ne répond pas. Réessayez dans un instant.",
    ],
    ["a refused password, already said by the logout", new PasswordRejectedError("x"), null],
  ])("words %s", (_case, error, text) => {
    expect(staffErrorText(error)).toBe(text);
  });
});
