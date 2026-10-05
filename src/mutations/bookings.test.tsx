import type { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { renderHook } from "vitest-browser-react";

import { BusinessError } from "@/api/errors";
import type { BookingR1Input, OrderR2Input, PublicState } from "@/domain/types";
import { isSeatsRefusal, useBookR1, useOrderR2 } from "@/mutations/bookings";
import { createQueryClient } from "@/queries/client";
import { stateKeys } from "@/queries/state";
import { useSessionStore } from "@/session/session";
import { fakeScript } from "@/test/browser-fake-script";
import { publicState } from "@/test/domain-states";
import { TestProviders } from "@/test/providers";

// Bookings sent to the fake script (02 § 4.4, § 5.2, § 5.3; PLAN § 3.3.3).

const initialSession = useSessionStore.getState();

beforeEach(() => {
  useSessionStore.setState(initialSession, true);
});

function wrapperOf(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <TestProviders queryClient={queryClient}>{children}</TestProviders>
  );
}

const INPUT: BookingR1Input = {
  date: "2026-10-05",
  name: "Jean Dupuis",
  contact: "jean.dupuis@exemple.fr",
  className: "TS2",
  students: 2,
  staffMembers: 1,
  externals: 0,
  observation: "Allergie aux noix",
  requestId: "req-1",
};

function posts() {
  return fakeScript()
    .requests.filter((request) => request.method === "POST")
    .map((request) => request.json);
}

async function renderBookR1(queryClient: QueryClient = createQueryClient()) {
  queryClient.setQueryData(stateKeys.public(), publicState({ etag: "avant" }));
  const { result } = await renderHook(() => useBookR1(), { wrapper: wrapperOf(queryClient) });
  return { result, queryClient };
}

describe("useBookR1 (02 § 4.4)", () => {
  it("sends the booking once and puts the public state of the answer in the cache", async () => {
    const { result, queryClient } = await renderBookR1();
    const response = await result.current.mutateAsync(INPUT);
    // Body translated by api/actions.ts (tested there): sent once, with the form's requestId.
    expect(posts()).toStrictEqual([
      expect.objectContaining({ action: "addBookingR1", date: "2026-10-05", requestId: "req-1" }),
    ]);
    expect(response.duplicate).toBe(false);
    expect(queryClient.getQueryData<PublicState>(stateKeys.public())).toStrictEqual(response.state);
  });

  it("answers `duplicate` to the same requestId, without a second booking (02 § 5.3)", async () => {
    const { result } = await renderBookR1();
    const before = fakeScript().db.r1Bookings.length;
    await result.current.mutateAsync(INPUT);
    const again = await result.current.mutateAsync(INPUT);
    expect(again.duplicate).toBe(true);
    expect(fakeScript().db.r1Bookings).toHaveLength(before + 1);
  });

  it("is never replayed after a failure (R-11)", async () => {
    fakeScript().failNext("network");
    const { result } = await renderBookR1();
    await expect(result.current.mutateAsync(INPUT)).rejects.toThrow();
    expect(posts()).toHaveLength(1);
  });

  it("reads the state again after a refusal for lack of seats (E-35)", async () => {
    const { result, queryClient } = await renderBookR1();
    // Monday 5 October has 12 seats left in the seed.
    await expect(result.current.mutateAsync({ ...INPUT, students: 13 })).rejects.toThrow(
      "Il ne reste que 12 couvert(s) pour ce jour.",
    );
    expect(queryClient.getQueryState(stateKeys.public())?.isInvalidated).toBe(true);
  });

  it("reads the full state again when a staff session opened during the send (02 § 5.2)", async () => {
    const queryClient = createQueryClient();
    const { result } = await renderBookR1(queryClient);
    useSessionStore.getState().open("secret");
    queryClient.setQueryData(stateKeys.staff(1), { marker: true });
    await result.current.mutateAsync(INPUT);
    expect(queryClient.getQueryState(stateKeys.staff(1))?.isInvalidated).toBe(true);
  });
});

describe("isSeatsRefusal (02 § 4.4)", () => {
  it.each([
    ["Il ne reste que 2 couvert(s) pour ce jour.", true],
    ["Il ne reste que 0 couvert(s) pour ce jour.", true],
    ["Ce jour n'existe plus.", false],
    ["Le serveur est très sollicité : réessayez dans quelques secondes.", false],
  ])("« %s » → %s", (message, expected) => {
    expect(isSeatsRefusal(new BusinessError(message))).toBe(expected);
  });

  it("ignores a technical failure with the same words", () => {
    expect(isSeatsRefusal(new Error("Il ne reste que 2 couvert(s) pour ce jour."))).toBe(false);
  });
});

const ORDER: OrderR2Input = {
  date: "2026-10-05",
  name: "Léa Martin",
  contact: "lea.martin@exemple.fr",
  className: "BTS1",
  serviceMode: "takeaway",
  items: [{ dishId: "r2i-d0-lasagnes", portions: 1 }],
  observation: "",
  requestId: "req-2",
};

async function renderOrderR2() {
  const queryClient = createQueryClient();
  queryClient.setQueryData(stateKeys.public(), publicState({ etag: "avant" }));
  const { result } = await renderHook(() => useOrderR2(), { wrapper: wrapperOf(queryClient) });
  return { result, queryClient };
}

/** Portions booked of a dish in the public state of the cache (01 § 3.2). */
function bookedOf(queryClient: QueryClient, dishId: string): number {
  const state = queryClient.getQueryData<PublicState>(stateKeys.public());
  return state?.r2Booked.find((total) => total.dishId === dishId)?.portions ?? 0;
}

describe("useOrderR2 (02 § 4.5)", () => {
  it("sends the order and puts the public state of the answer in the cache", async () => {
    const { result, queryClient } = await renderOrderR2();
    const response = await result.current.mutateAsync(ORDER);
    expect(posts()).toStrictEqual([
      expect.objectContaining({ action: "addBookingR2Multi", requestId: "req-2" }),
    ]);
    expect(queryClient.getQueryData<PublicState>(stateKeys.public())).toStrictEqual(response.state);
    expect(response.bookingResult?.confirmed).toStrictEqual([
      { dishId: "r2i-d0-lasagnes", name: "Lasagnes", portions: 1, price: 4.5, voucher: false },
    ]);
    expect(response.emailStatus).toStrictEqual({ sent: true, reason: null });
  });

  it("reads the portions granted and the e-mail failure of the answer (a-20)", async () => {
    fakeScript().db.mailError = "Service invoked too many times for one day: email.";
    const { result } = await renderOrderR2();
    // 4 Lasagnes left in the seed.
    const response = await result.current.mutateAsync({
      ...ORDER,
      items: [{ dishId: "r2i-d0-lasagnes", portions: 6 }],
    });
    expect(response.bookingResult?.confirmed[0]?.portions).toBe(4);
    expect(response.bookingResult?.adjusted).toStrictEqual([
      { name: "Lasagnes", requested: 6, granted: 4 },
    ]);
    expect(response.emailStatus).toStrictEqual({
      sent: false,
      reason: "Service invoked too many times for one day: email.",
    });
  });

  it("resolves when nothing was granted, with the state read again; the requestId stays usable (E-11)", async () => {
    const { result, queryClient } = await renderOrderR2();
    const soldOut = await result.current.mutateAsync({
      ...ORDER,
      requestId: "req-other",
      items: [{ dishId: "r2i-d0-wrap", portions: 5 }],
    });
    expect(soldOut.bookingResult?.confirmed).toHaveLength(1);
    const nothing = await result.current.mutateAsync({
      ...ORDER,
      items: [{ dishId: "r2i-d0-wrap", portions: 2 }],
    });
    expect(nothing.duplicate).toBe(false);
    expect(nothing.bookingResult?.confirmed).toStrictEqual([]);
    expect(nothing.bookingResult?.skipped).toStrictEqual([{ name: "Wrap" }]);
    expect(bookedOf(queryClient, "r2i-d0-wrap")).toBe(5);
    // The script recorded nothing for this requestId (02 § 4.5): the next attempt is not a duplicate.
    const retry = await result.current.mutateAsync(ORDER);
    expect(retry.duplicate).toBe(false);
    expect(retry.bookingResult?.confirmed).toHaveLength(1);
  });
});
