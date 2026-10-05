import type { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { renderHook } from "vitest-browser-react";

import { BusinessError, ServiceError } from "@/api/errors";
import { fetchFullState } from "@/api/state";
import type { FullState } from "@/domain/types";
import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import {
  isCapacityRefusal,
  useDeleteBooking,
  useEditBookingR1,
  useEditBookingR2,
} from "@/mutations/staff/bookings";
import { createQueryClient } from "@/queries/client";
import { stateKeys } from "@/queries/state";
import { useSessionStore } from "@/session/session";
import { fakeScript } from "@/test/browser-fake-script";
import { TestProviders } from "@/test/providers";

// Staff writes of the bookings (02 § 4.7, 06 § 5.2, § 7.3-7.4) through the factory of write.ts, on the fake script.

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

function posts() {
  return fakeScript()
    .requests.filter((request) => request.method === "POST")
    .map((request) => request.json as Record<string, unknown>)
    .filter((body) => Object.values(body)[0] !== "getAdminState");
}

describe("isCapacityRefusal (02 § 4.7)", () => {
  it.each([
    ["Il ne reste que 2 couvert(s) disponible(s) pour ce jour.", true],
    ["Il ne reste que -1 couvert(s) disponible(s) pour ce jour.", true],
    ["Il ne reste que 3 portion(s) disponible(s) pour ce plat.", true],
    ["Il ne reste que 2 couvert(s) pour ce jour.", false],
    ["Réservation introuvable.", false],
  ])("%s → %s", (message, expected) => {
    expect(isCapacityRefusal(new BusinessError(message))).toBe(expected);
  });

  it("is false for a failure of the service", () => {
    expect(isCapacityRefusal(new ServiceError("down"))).toBe(false);
  });
});

describe("booking writes", () => {
  it("edits an R1 booking with the password of the store, keyed ['write','bookings','editBookingR1']", async () => {
    const queryClient = createQueryClient();
    const id = await loggedIn(queryClient);
    const { result } = await renderHook(() => useEditBookingR1(), {
      wrapper: wrapperOf(queryClient),
    });
    await result.current.mutateAsync({
      id: "r1b-d+1-martin",
      name: "Léa Martin",
      contact: "06 12 34 56 78",
      className: "BTS1",
      seats: 2,
      students: 0,
      staffMembers: 0,
      externals: 2,
      total: 19.8,
      observation: "",
    });
    expect(queryClient.getMutationCache().getAll()[0]?.options.mutationKey).toStrictEqual([
      "write",
      "bookings",
      "editBookingR1",
    ]);
    expect(posts().map((body) => Object.values(body))).toStrictEqual([
      [
        "editBookingR1",
        SEED_PASSWORD,
        "r1b-d+1-martin",
        "Léa Martin",
        "06 12 34 56 78",
        "BTS1",
        2,
        0,
        0,
        2,
        19.8,
        "",
      ],
    ]);
    const state = queryClient.getQueryData<FullState>(stateKeys.staff(id));
    expect(state?.r1Bookings.find((booking) => booking.id === "r1b-d+1-martin")?.seats).toBe(2);
  });

  it("edits an R2 booking line, its service mode included", async () => {
    const queryClient = createQueryClient();
    const id = await loggedIn(queryClient);
    const { result } = await renderHook(() => useEditBookingR2(), {
      wrapper: wrapperOf(queryClient),
    });
    await result.current.mutateAsync({
      id: "r2b-d+6-bernard",
      name: "Noah Bernard",
      contact: "n.bernard@exemple.fr",
      className: "TS1",
      portions: 2,
      serviceMode: "dineIn",
      observation: "",
    });
    expect(posts().map((body) => Object.values(body)[0])).toStrictEqual(["editBookingR2"]);
    const state = queryClient.getQueryData<FullState>(stateKeys.staff(id));
    const line = state?.r2Bookings.find((booking) => booking.id === "r2b-d+6-bernard");
    expect(line?.portions).toBe(2);
    expect(line?.serviceMode).toBe("dineIn");
  });

  it.each([
    ["r1", "r1b-d+1-petit", "deleteBookingR1"],
    ["r2", "r2b-d0-martin", "deleteBookingR2"],
  ] as const)("deletes an %s booking by its id", async (restaurant, id, action) => {
    const queryClient = createQueryClient();
    const session = await loggedIn(queryClient);
    const { result } = await renderHook(() => useDeleteBooking(restaurant), {
      wrapper: wrapperOf(queryClient),
    });
    await result.current.mutateAsync(id);
    expect(posts().map((body) => Object.values(body))).toStrictEqual([[action, SEED_PASSWORD, id]]);
    const state = queryClient.getQueryData<FullState>(stateKeys.staff(session));
    const ids = [...(state?.r1Bookings ?? []), ...(state?.r2Bookings ?? [])].map((b) => b.id);
    expect(ids).not.toContain(id);
  });

  it("writes nothing when the session closed before the answer (F-02)", async () => {
    const queryClient = createQueryClient();
    const id = await loggedIn(queryClient);
    const { result } = await renderHook(() => useDeleteBooking("r1"), {
      wrapper: wrapperOf(queryClient),
    });
    const release = fakeScript().hold();
    const pending = result.current.mutateAsync("r1b-d+1-petit");
    await expect.poll(() => posts().length).toBe(1);
    useSessionStore.getState().close("logout");
    queryClient.removeQueries({ queryKey: stateKeys.staffAll() });
    release();
    await pending;
    expect(queryClient.getQueryData(stateKeys.staff(id))).toBeUndefined();
  });
});
