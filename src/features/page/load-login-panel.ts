import { useSyncExternalStore } from "react";

import type * as LoginPanelChunk from "@/features/page/LoginPanel";

// Chunk of the login panel, out of the initial path (S3, R-15): loaded on « Collègue », or when `?connexion=true`
// shows the panel. No `lazy()` + `<Suspense>`: React reveals a suspended boundary after a throttle timer, which a page
// clock paused by the E2E scenarios never fires (journal p4c, decision 3; `features/r1/load-booking-form.ts`).

type LoginPanelModule = typeof LoginPanelChunk;

let loaded: LoginPanelModule | null = null;
let loading: Promise<LoginPanelModule> | null = null;
const listeners = new Set<() => void>();

async function importChunk(): Promise<LoginPanelModule> {
  const module = await import("@/features/page/LoginPanel");
  loaded = module;
  for (const listener of listeners) listener();
  return module;
}

/** Starts loading the chunk once; later calls return the same promise. */
export async function loadLoginPanel(): Promise<LoginPanelModule> {
  loading ??= importChunk();
  return loading;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  void loadLoginPanel();
  return () => {
    listeners.delete(listener);
  };
}

/** The chunk once loaded, else null; subscribing starts the load. */
export function useLoginPanelModule(): LoginPanelModule | null {
  return useSyncExternalStore(
    subscribe,
    () => loaded,
    () => null,
  );
}
