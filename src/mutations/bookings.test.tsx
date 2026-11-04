import type { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { renderHook } from "vitest-browser-react";

import { BusinessError } from "@/api/errors";
import type { BookingR1Input, PublicState } from "@/domain/types";
import { isSeatsRefusal, useBookR1 } from "@/mutations/bookings";
import { createQueryClient } from "@/queries/client";
import { stateKeys } from "@/queries/state";
import { useSessionStore } from "@/session/session";
import { fakeScript } from "@/test/browser-fake-script";
import { publicState } from "@/test/domain-states";
import { TestProviders } from "@/test/providers";

// Bookings sent to the fake script (02 § 4.4, § 5.2; PLAN § 3.3.3). `useOrderR2` shares the cache update; its
// answers are read by OrderFormR2.test.tsx and REG-23, REG-24.

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
