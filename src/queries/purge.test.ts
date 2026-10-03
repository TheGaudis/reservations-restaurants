import { CancelledError, MutationObserver } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";

import { editBookingR2 } from "@/api/actions";
import type { EditBookingR2Input } from "@/domain/types";
import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { createQueryClient } from "@/queries/client";
import { purgeStaffSession } from "@/queries/purge";
import { publicStateOptions, stateKeys, staffStateOptions } from "@/queries/state";
import { fullState, publicState } from "@/test/domain-states";
import { fakeScriptPerTest } from "@/test/fake-script-server";

// Step 2 of the logout on a real QueryClient (PLAN § 3.3.4, S8): nothing of a staff session is left in the
// query or mutation caches, and the public state stays.

const start = fakeScriptPerTest();

it("removes every full state and every write, and keeps the public state", async () => {
  start();
  const queryClient = createQueryClient();
  const shown = publicState();
  queryClient.setQueryData(publicStateOptions.queryKey, shown);
  queryClient.setQueryData(stateKeys.staff(1), fullState());
  queryClient.setQueryData(stateKeys.staff(2), fullState());
  const write = new MutationObserver(queryClient, {
    mutationKey: ["write", "bookings", "editBookingR1"],
    mutationFn: async (variables: EditBookingR2Input) => editBookingR2(SEED_PASSWORD, variables),
  });
  await write.mutate({
    id: "r2b-d+1-bernard",
    name: "Noah Bernard",
    contact: "n.bernard@exemple.fr",
    className: "TS1",
    portions: 1,
    serviceMode: "dineIn",
    observation: "",
  });
  expect(queryClient.getMutationCache().getAll()).toHaveLength(1);

  purgeStaffSession(queryClient);

  expect(queryClient.getQueryCache().findAll({ queryKey: stateKeys.staffAll() })).toStrictEqual([]);
  expect(queryClient.getMutationCache().getAll()).toStrictEqual([]);
  expect(queryClient.getQueryData(publicStateOptions.queryKey)).toBe(shown);
});

it("cancels a read of the full state in flight, whose answer then writes nothing", async () => {
  const fakeScript = start();
  const queryClient = createQueryClient();
  const release = fakeScript.hold();
  const read = queryClient.query(staffStateOptions(1, SEED_PASSWORD));
  await vi.waitFor(() => {
    expect(fakeScript.requests).toHaveLength(1);
  });

  purgeStaffSession(queryClient);
  release();

  await expect(read).rejects.toBeInstanceOf(CancelledError);
  // The held answer is released: let it arrive.
  await new Promise((resolve) => {
    setTimeout(resolve, 20);
  });
  expect(queryClient.getQueryCache().findAll({ queryKey: stateKeys.staffAll() })).toStrictEqual([]);
});
