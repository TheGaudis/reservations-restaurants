import type { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { renderHook } from "vitest-browser-react";

import { SETTINGS_API_KEYS } from "@/api/actions";
import { BusinessError } from "@/api/errors";
import { fetchFullState } from "@/api/state";
import type { FullState, SettingInput } from "@/domain/types";
import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { SettingsPartialFailureError, useSaveSettings } from "@/mutations/staff/settings";
import { createQueryClient } from "@/queries/client";
import { stateKeys } from "@/queries/state";
import { useSessionStore } from "@/session/session";
import { fakeScript } from "@/test/browser-fake-script";
import { TestProviders } from "@/test/providers";

// « Enregistrer les paramètres » (02 § 4.7, 06 § 2.2, D-20): one `setConfigField` per changed field, in sequence,
// through the factory of write.ts, on the fake script.

const LOCK_BUSY = "Le serveur est très sollicité : réessayez dans quelques secondes.";

const CONTACT: SettingInput = { key: "cancellationContact", value: "la vie scolaire" };
const NAME2: SettingInput = { key: "name2", value: "Le Bistrot" };
const PRICE_STAFF: SettingInput = { key: "priceStaff", value: "6.50" };

function wrapperOf(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <TestProviders queryClient={queryClient}>{children}</TestProviders>
  );
}

async function loggedIn(queryClient: QueryClient): Promise<number> {
  const id = useSessionStore.getState().id + 1;
  queryClient.setQueryData(stateKeys.staff(id), await fetchFullState(SEED_PASSWORD));
  useSessionStore.getState().open(SEED_PASSWORD);
  return id;
}

/** Bodies of the `setConfigField` requests, values in the order of api/actions.ts. */
function settingPosts(): unknown[][] {
  return fakeScript()
    .requests.filter((request) => request.method === "POST")
    .map((request) => Object.values(request.json as Record<string, unknown>))
    .filter((values) => values[0] === "setConfigField");
}

async function renderSave(queryClient: QueryClient) {
  const { result } = await renderHook(() => useSaveSettings(), {
    wrapper: wrapperOf(queryClient),
  });
  return result;
}

describe("useSaveSettings (06 § 2.2)", () => {
  it("sends one request per field, keyed ['write','settings','save'], and keeps the last full state", async () => {
    const queryClient = createQueryClient();
    const id = await loggedIn(queryClient);
    const save = await renderSave(queryClient);
    await save.current.mutateAsync([NAME2, PRICE_STAFF]);
    expect(queryClient.getMutationCache().getAll()[0]?.options.mutationKey).toStrictEqual([
      "write",
      "settings",
      "save",
    ]);
    expect(settingPosts()).toStrictEqual([
      ["setConfigField", SEED_PASSWORD, SETTINGS_API_KEYS.name2, "Le Bistrot"],
      ["setConfigField", SEED_PASSWORD, SETTINGS_API_KEYS.priceStaff, "6.50"],
    ]);
    const settings = queryClient.getQueryData<FullState>(stateKeys.staff(id))?.settings;
    expect(settings).toMatchObject({ name2: "Le Bistrot", priceStaff: 6.5 });
  });

  it("sends the second request only once the first answered (06 § 2.2 (4))", async () => {
    const queryClient = createQueryClient();
    await loggedIn(queryClient);
    const save = await renderSave(queryClient);
    const release = fakeScript().hold();
    const sending = save.current.mutateAsync([NAME2, PRICE_STAFF]);
    await expect.poll(() => settingPosts().length).toBe(1);
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    expect(settingPosts()).toHaveLength(1);
    release();
    await sending;
    expect(settingPosts()).toHaveLength(2);
  });

  it("keeps the fields saved before a refusal and names what was not saved (D-20)", async () => {
    const queryClient = createQueryClient();
    const id = await loggedIn(queryClient);
    const save = await renderSave(queryClient);
    const release = fakeScript().hold();
    const sending = save.current.mutateAsync([CONTACT, PRICE_STAFF, NAME2]);
    await expect.poll(() => settingPosts().length).toBe(1);
    fakeScript().failNext("error");
    release();
    const failure: unknown = await sending.catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(SettingsPartialFailureError);
    if (!(failure instanceof SettingsPartialFailureError)) return;
    expect(failure.saved).toStrictEqual(["cancellationContact"]);
    expect(failure.failed).toStrictEqual(["priceStaff", "name2"]);
    expect(failure.cause).toStrictEqual(new BusinessError(LOCK_BUSY));
    // The third field is never sent after the refusal of the second.
    expect(settingPosts()).toHaveLength(2);
    const settings = queryClient.getQueryData<FullState>(stateKeys.staff(id))?.settings;
    expect(settings).toMatchObject({
      cancellationContact: "la vie scolaire",
      priceStaff: 6.1,
      name2: "Aristide",
    });
  });

  it("rejects with the script's error as is when the first field is refused", async () => {
    const queryClient = createQueryClient();
    const id = await loggedIn(queryClient);
    const before = queryClient.getQueryData<FullState>(stateKeys.staff(id));
    const save = await renderSave(queryClient);
    fakeScript().failNext("error");
    await expect(save.current.mutateAsync([CONTACT, NAME2])).rejects.toStrictEqual(
      new BusinessError(LOCK_BUSY),
    );
    expect(settingPosts()).toHaveLength(1);
    expect(queryClient.getQueryData<FullState>(stateKeys.staff(id))).toBe(before);
  });

  it("writes nothing of a partial failure answered after the logout (F-02)", async () => {
    const queryClient = createQueryClient();
    await loggedIn(queryClient);
    const save = await renderSave(queryClient);
    const release = fakeScript().hold();
    const sending = save.current.mutateAsync([CONTACT, PRICE_STAFF]);
    await expect.poll(() => settingPosts().length).toBe(1);
    fakeScript().failNext("error");
    useSessionStore.getState().close("inactivity");
    queryClient.removeQueries({ queryKey: stateKeys.staffAll() });
    release();
    await expect(sending).rejects.toBeInstanceOf(SettingsPartialFailureError);
    expect(queryClient.getQueryCache().findAll({ queryKey: stateKeys.staffAll() })).toStrictEqual(
      [],
    );
  });
});
