import type { FullState } from "@/domain/types";
import { useAppState } from "@/queries/use-app-state";
import type { AppState } from "@/queries/use-app-state";

/** The full state carries the bookings; the public state only their sums (02 § 3.2, § 4.3). */
function asFullState(state: AppState): FullState {
  // `StaffPage` renders nothing of the staff mode once the session closes (PLAN § 3.3.4): this never runs then.
  if (!("r1Bookings" in state)) {
    throw new Error("Staff component rendered without an open staff session.");
  }
  return state;
}

/**
 * The full state of the open staff session, for the panels and the staff blocks of the day cards (06 § 2-8). Same
 * source and same refresh as `useAppState` (PLAN § 3.3.2): no read of its own.
 */
export function useFullState(): FullState {
  return useAppState(asFullState);
}

/** `useFullState` through `select`, for a component that renders again only when its part changes. */
export function useStaffState<T>(select: (state: FullState) => T): T {
  return useAppState((state) => select(asFullState(state)));
}
