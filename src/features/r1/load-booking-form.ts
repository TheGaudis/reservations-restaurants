import { useSyncExternalStore } from "react";

import type * as BookingFormR1Chunk from "@/features/r1/BookingFormR1";

// Chunk of the R1 booking form, out of the initial path (S3, R-15). It is loaded when « Réserver » is hovered,
// focused or pressed (R-31), or when the form must show. No `lazy()` + `<Suspense>`: React reveals a suspended
// boundary after a throttle timer, which a page clock paused by the E2E scenarios never fires (REG-08, REG-20).

type BookingFormR1Module = typeof BookingFormR1Chunk;

let loaded: BookingFormR1Module | null = null;
let loading: Promise<BookingFormR1Module> | null = null;
const listeners = new Set<() => void>();

async function importChunk(): Promise<BookingFormR1Module> {
  const module = await import("@/features/r1/BookingFormR1");
  loaded = module;
  for (const listener of listeners) listener();
  return module;
}

/** Starts loading the chunk once; later calls return the same promise. */
export async function loadBookingFormR1(): Promise<BookingFormR1Module> {
  loading ??= importChunk();
  return loading;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  void loadBookingFormR1();
  return () => {
    listeners.delete(listener);
  };
}

/** The chunk once loaded, else null; subscribing starts the load. */
export function useBookingFormR1Module(): BookingFormR1Module | null {
  return useSyncExternalStore(
    subscribe,
    () => loaded,
    () => null,
  );
}
