import { useCallback, useRef, useState } from "react";

import { SLOW_WRITE_MS } from "@/domain/constants";

/**
 * Slow-write signal of D-15: true 20 s after `start` until `stop`. The write itself is never interrupted (R-11).
 * The timer is armed by the submit handler and kept in a ref; `clearOnUnmount` is the ref callback that clears it
 * when the form leaves the page (`SlowWriteNotice` carries it).
 */
export function useSlowWrite() {
  const [slow, setSlow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // React runs the cleanup of a ref callback each time it receives a new callback: a stable callback keeps the timer
  // across renders and clears it once, when the form unmounts.
  const clearOnUnmount = useCallback(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );
  return {
    slow,
    clearOnUnmount,
    start: () => {
      clearTimeout(timer.current);
      setSlow(false);
      timer.current = setTimeout(() => {
        setSlow(true);
      }, SLOW_WRITE_MS);
    },
    stop: () => {
      clearTimeout(timer.current);
      setSlow(false);
    },
  };
}
