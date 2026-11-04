import { describe, expect, it, vi } from "vitest";

import { reloadOnce } from "@/background/preload-error";

// Stale chunk after a deployment (R-06, PLAN § 3.9): one reload, never a loop.

function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
  };
}

describe("reloadOnce", () => {
  it("reloads the first time and keeps the time in sessionStorage", () => {
    const storage = memoryStorage();
    const reload = vi.fn<() => void>();
    expect(reloadOnce({ storage, reload, now: 1000 })).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
    expect(storage.getItem("reservations-preload-reload")).toBe("1000");
  });

  it("does not reload again within a minute: the error reaches the router", () => {
    const storage = memoryStorage({ "reservations-preload-reload": "1000" });
    const reload = vi.fn<() => void>();
    expect(reloadOnce({ storage, reload, now: 60_999 })).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it("reloads again for a later deployment", () => {
    const storage = memoryStorage({ "reservations-preload-reload": "1000" });
    const reload = vi.fn<() => void>();
    expect(reloadOnce({ storage, reload, now: 61_000 })).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
  });

  it("does not reload when the storage is blocked", () => {
    const reload = vi.fn<() => void>();
    const storage = {
      getItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
      setItem: () => {
        // Never reached.
      },
    };
    expect(reloadOnce({ storage, reload, now: 1000 })).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
