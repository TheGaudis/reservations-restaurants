import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

type SessionEnd = "logout" | "inactivity" | "password-changed";

interface SessionState {
  password: string | null;
  id: number;
  endReason: SessionEnd | null;
  open: (password: string) => void;
  close: (reason: SessionEnd) => void;
}

export const useSessionStore = create<SessionState>()(
  subscribeWithSelector((set) => ({
    password: null,
    id: 0,
    endReason: null,
    open: (password) => {
      set((s) => ({ password, id: s.id + 1, endReason: null }));
    },
    close: (reason) => {
      set({ password: null, endReason: reason });
    },
  })),
);
