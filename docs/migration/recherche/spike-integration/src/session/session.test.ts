import { expect, it, vi } from "vitest";

import { useSessionStore } from "@/session/session";

it("subscribeWithSelector notifies only when the selected slice changes", () => {
  const listener = vi.fn();
  const unsubscribe = useSessionStore.subscribe((s) => s.password !== null, listener);
  useSessionStore.getState().open("secret");
  useSessionStore.getState().open("secret2");
  useSessionStore.getState().close("logout");
  unsubscribe();
  expect(listener.mock.calls).toStrictEqual([
    [true, false],
    [false, true],
  ]);
});
