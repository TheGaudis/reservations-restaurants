import { afterEach, expect, it, vi } from "vitest";

import { useSessionStore } from "@/session/session";
import type { SessionEnd } from "@/session/session";

const initial = useSessionStore.getState();

afterEach(() => {
  useSessionStore.setState(initial, true);
});

it("starts closed", () => {
  expect(useSessionStore.getState()).toMatchObject({ password: null, id: 0, endReason: null });
});

it("opens a session with a new number and clears the previous end reason", () => {
  useSessionStore.setState({ endReason: "inactivity" });
  useSessionStore.getState().open("secret");
  expect(useSessionStore.getState()).toMatchObject({ password: "secret", id: 1, endReason: null });
  useSessionStore.getState().close("logout");
  useSessionStore.getState().open("secret");
  expect(useSessionStore.getState().id).toBe(2);
});

it.each<SessionEnd>(["logout", "inactivity", "password-changed"])(
  "closes with the reason %s and keeps the session number (06 § 1.5)",
  (reason) => {
    useSessionStore.getState().open("secret");
    useSessionStore.getState().close(reason);
    expect(useSessionStore.getState()).toMatchObject({ password: null, id: 1, endReason: reason });
  },
);

it("ignores a close when no session is open: the first reason stays", () => {
  useSessionStore.getState().open("secret");
  useSessionStore.getState().close("password-changed");
  useSessionStore.getState().close("logout");
  expect(useSessionStore.getState().endReason).toBe("password-changed");
});

it("notifies a selector subscriber once per change of the logged-in state", () => {
  const listener = vi.fn<(loggedIn: boolean) => void>();
  const unsubscribe = useSessionStore.subscribe((s) => s.password !== null, listener);
  useSessionStore.getState().open("secret");
  useSessionStore.getState().close("inactivity");
  useSessionStore.getState().close("logout");
  unsubscribe();
  expect(listener.mock.calls).toStrictEqual([
    [true, false],
    [false, true],
  ]);
});

it("never writes the password to the browser storage", () => {
  const setItem = vi.fn<(key: string, value: string) => void>();
  vi.stubGlobal("localStorage", { setItem });
  vi.stubGlobal("sessionStorage", { setItem });
  useSessionStore.getState().open("secret");
  expect(setItem).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});
