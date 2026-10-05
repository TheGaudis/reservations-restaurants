import { useAppState } from "@/queries/use-app-state";
import type { AppState } from "@/queries/use-app-state";

const whole = (state: AppState): AppState => state;

/**
 * The state shown (public, or full during a staff session), whole: calendars and cards derive their days, gauges and
 * dishes from it with `domain/capacity.ts`, whose index is built once per state (01 § 4.3).
 */
export function useShownState(): AppState {
  return useAppState(whole);
}
