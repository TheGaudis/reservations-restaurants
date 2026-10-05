/**
 * Today's local date (`YYYY-MM-DD`), shared by components (`useToday`) and
 * route loaders (`getToday`). While something is subscribed, one timer
 * fires just after midnight and notifies the subscribers of the new date;
 * `src/main.tsx` subscribes for the whole session to reload the routes.
 */
import { useSyncExternalStore } from "react";
import { addDays, parseISO, todayISO } from "./dates";

let today = todayISO();
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function armTimer() {
  const msToMidnight = parseISO(addDays(today, 1)).getTime() - Date.now();
  timer = setTimeout(flip, Math.max(1000, msToMidnight + 1000));
}

function flip() {
  const previous = today;
  today = todayISO();
  armTimer();
  if (today !== previous) {
    for (const listener of listeners) listener();
  }
}

/** Today's date; the cached value while the midnight timer runs. */
export function getToday(): string {
  if (timer === undefined) today = todayISO();
  return today;
}

/** Calls `listener` when the date changes; returns the unsubscribe function. */
export function subscribeToday(listener: () => void): () => void {
  if (timer === undefined) {
    today = todayISO();
    armTimer();
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearTimeout(timer);
      timer = undefined;
    }
  };
}

/** Today's date, re-rendering the component when it changes. */
export function useToday(): string {
  return useSyncExternalStore(subscribeToday, getToday);
}
