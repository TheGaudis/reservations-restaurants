import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { startInactivity } from "@/background/inactivity";
import { useSessionStore } from "@/session/session";
import { TEST_NOW } from "@/test/clock";

const MINUTE = 60_000;
const initialSession = useSessionStore.getState();
let stop: (() => void) | undefined;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  vi.setSystemTime(TEST_NOW);
  stop = startInactivity(useSessionStore);
});

afterEach(() => {
  stop?.();
  vi.useRealTimers();
  useSessionStore.setState(initialSession, true);
});

function login(): void {
  useSessionStore.getState().open("secret");
}

function session() {
  const { password, endReason } = useSessionStore.getState();
  return { open: password !== null, endReason };
}

describe("inactivity (06 § 1.6)", () => {
  it("closes the session after 10 minutes without activity, not before", () => {
    login();
    vi.advanceTimersByTime(10 * MINUTE - 1);
    expect(session()).toStrictEqual({ open: true, endReason: null });
    vi.advanceTimersByTime(1);
    expect(session()).toStrictEqual({ open: false, endReason: "inactivity" });
  });

  it.each([
    ["click", () => new MouseEvent("click", { bubbles: true })],
    ["keydown", () => new KeyboardEvent("keydown", { key: "a", bubbles: true })],
    ["mousemove", () => new MouseEvent("mousemove", { bubbles: true })],
    ["touchstart", () => new Event("touchstart", { bubbles: true })],
  ])("counts %s as activity and pushes the deadline back", (_, event) => {
    login();
    vi.advanceTimersByTime(4 * MINUTE);
    document.body.dispatchEvent(event());
    vi.advanceTimersByTime(9 * MINUTE);
    expect(session().open).toBe(true);
    vi.advanceTimersByTime(MINUTE);
    expect(session()).toStrictEqual({ open: false, endReason: "inactivity" });
  });

  it("counts an event whose propagation a component stops", () => {
    const button = document.createElement("button");
    button.addEventListener("keydown", (event) => {
      event.stopPropagation();
    });
    document.body.append(button);
    login();
    vi.advanceTimersByTime(5 * MINUTE);
    button.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    vi.advanceTimersByTime(6 * MINUTE);
    expect(session().open).toBe(true);
    button.remove();
  });

  it.each(["scroll", "wheel", "focusin"])("does not count %s", (type) => {
    login();
    vi.advanceTimersByTime(5 * MINUTE);
    document.dispatchEvent(new Event(type, { bubbles: true }));
    vi.advanceTimersByTime(5 * MINUTE);
    expect(session().endReason).toBe("inactivity");
  });

  it("starts counting at login: activity before it does not shorten the session", () => {
    vi.advanceTimersByTime(30 * MINUTE);
    login();
    vi.advanceTimersByTime(10 * MINUTE - 1);
    expect(session().open).toBe(true);
  });

  it.each([
    ["visibilitychange", () => document.dispatchEvent(new Event("visibilitychange"))],
    ["pageshow", () => window.dispatchEvent(new PageTransitionEvent("pageshow"))],
  ])("checks again on %s when the timer was frozen (R-26)", (_, dispatch) => {
    login();
    vi.setSystemTime(TEST_NOW + 11 * MINUTE); // a sleeping device: no timer has run
    expect(session().open).toBe(true);
    dispatch();
    expect(session()).toStrictEqual({ open: false, endReason: "inactivity" });
  });

  it("keeps the session on visibilitychange after recent activity", () => {
    login();
    vi.setSystemTime(TEST_NOW + 9 * MINUTE);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(session().open).toBe(true);
    vi.advanceTimersByTime(MINUTE);
    expect(session().endReason).toBe("inactivity");
  });

  it("disarms the timer when the session closes for another reason (PLAN § 3.3.4, step 7)", () => {
    login();
    useSessionStore.getState().close("logout");
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(20 * MINUTE);
    expect(session()).toStrictEqual({ open: false, endReason: "logout" });
  });

  it("arms a new timer for the next session", () => {
    login();
    useSessionStore.getState().close("logout");
    vi.advanceTimersByTime(MINUTE);
    login();
    vi.advanceTimersByTime(10 * MINUTE - 1);
    expect(session().open).toBe(true);
    vi.advanceTimersByTime(1);
    expect(session().endReason).toBe("inactivity");
  });

  it("arms the timer for a session opened before the start (HMR)", () => {
    stop?.();
    login();
    stop = startInactivity(useSessionStore);
    vi.advanceTimersByTime(10 * MINUTE);
    expect(session().endReason).toBe("inactivity");
  });

  it("removes its listeners and its timer once stopped", () => {
    login();
    stop?.();
    stop = undefined;
    expect(vi.getTimerCount()).toBe(0);
    vi.setSystemTime(TEST_NOW + 11 * MINUTE);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(session().open).toBe(true);
  });
});
