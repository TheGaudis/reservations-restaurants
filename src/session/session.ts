// Staff session (PLAN § 3.4): in memory only, lost on reload (D-12, invariant 1). Never persisted.
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

/**
 * Why a staff session ended (06 § 1.5): « Client » button, 10 minutes of inactivity, password changed.
 * @public `background/logout.ts` reads it; it enters the production graph with P5 (a).
 */
export type SessionEnd = "logout" | "inactivity" | "password-changed";

interface SessionState {
  /** Memory only: never persisted, never in the URL or a query key. */
  readonly password: string | null;
  /** Session number: key ['state','staff', id]. */
  readonly id: number;
  /** Why the last session ended, for the toast. */
  readonly endReason: SessionEnd | null;
  readonly open: (password: string) => void;
  readonly close: (reason: SessionEnd) => void;
}

export const useSessionStore = create<SessionState>()(
  subscribeWithSelector((set, get) => ({
    password: null,
    id: 0,
    endReason: null,
    open: (password) => {
      set({ password, id: get().id + 1, endReason: null });
    },
    close: (reason) => {
      if (get().password !== null) set({ password: null, endReason: reason });
    },
  })),
);

export type SessionStore = typeof useSessionStore;
