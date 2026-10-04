import { useSyncExternalStore } from "react";

import type * as OrderFormR2Chunk from "@/features/r2/OrderFormR2";

// Chunk of the R2 order form, out of the initial path (S3, R-15). It is loaded when « Réserver » is hovered,
// focused or pressed (R-31), or when the form must show. No `lazy()` + `<Suspense>`: React reveals a suspended
// boundary after a throttle timer, which a page clock paused by the E2E scenarios never fires (R-36, REG-25).
// Same mechanism as features/r1/load-booking-form.ts.

type OrderFormR2Module = typeof OrderFormR2Chunk;

let loaded: OrderFormR2Module | null = null;
let loading: Promise<OrderFormR2Module> | null = null;
const listeners = new Set<() => void>();

async function importChunk(): Promise<OrderFormR2Module> {
  const module = await import("@/features/r2/OrderFormR2");
  loaded = module;
  for (const listener of listeners) listener();
  return module;
}

/** Starts loading the chunk once; later calls return the same promise. */
export async function loadOrderFormR2(): Promise<OrderFormR2Module> {
  loading ??= importChunk();
  return loading;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  void loadOrderFormR2();
  return () => {
    listeners.delete(listener);
  };
}

/** The chunk once loaded, else null; subscribing starts the load. */
export function useOrderFormR2Module(): OrderFormR2Module | null {
  return useSyncExternalStore(
    subscribe,
    () => loaded,
    () => null,
  );
}
