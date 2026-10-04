import { useSyncExternalStore } from "react";

// Chunks out of the initial path (S3, R-15), loaded on demand: the booking forms when « Réserver » is hovered,
// focused or pressed (R-31) or when the form must show, the login panel on « Collègue » or with `?connexion=true`.
// No `lazy()` + `<Suspense>`: React reveals a suspended boundary after a throttle timer, which a page clock paused by
// the E2E scenarios never fires (REG-08, REG-20, REG-25; journal p4c, decision 3).

interface LazyChunk<M> {
  /** Starts loading the chunk once; later calls do nothing. */
  load: () => void;
  subscribe: (listener: () => void) => () => void;
  current: () => M | null;
}

function lazyChunk<M>(importChunk: () => Promise<M>): LazyChunk<M> {
  let loaded: M | null = null;
  let loading: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const importAndNotify = async () => {
    loaded = await importChunk();
    for (const listener of listeners) listener();
  };
  const load = () => {
    loading ??= importAndNotify();
  };
  return {
    load,
    subscribe: (listener) => {
      listeners.add(listener);
      load();
      return () => {
        listeners.delete(listener);
      };
    },
    current: () => loaded,
  };
}

export const bookingFormR1Chunk = lazyChunk(async () => import("@/features/r1/BookingFormR1"));
export const orderFormR2Chunk = lazyChunk(async () => import("@/features/r2/OrderFormR2"));
export const loginPanelChunk = lazyChunk(async () => import("@/features/page/LoginPanel"));

/** The chunk once loaded, else null; the first render that asks for it starts the load. */
export function useChunk<M>(chunk: LazyChunk<M>): M | null {
  return useSyncExternalStore(chunk.subscribe, chunk.current, () => null);
}
