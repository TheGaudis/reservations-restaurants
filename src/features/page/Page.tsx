import type { ReactNode } from "react";

import type { Restaurant } from "@/domain/types";
import { Column } from "@/features/page/Column";
import { LoadErrorBox } from "@/features/page/LoadErrorBox";
import { columnTexts, usePageTexts } from "@/features/page/page-texts";
import { usePublicReadStatus } from "@/queries/use-app-state";

// Pieces of the `<main>` of both modes (PLAN § 3.2), composed by `PublicPage` and `StaffPage` under the header of the
// root. The route renders them with the state in the cache: without it, the skeleton (pending component) or the load
// error box of `LoadErrorPage` (G-01, G-03).

/**
 * Load error box over the local copy while no read has succeeded since the page loaded, with « Réessayer » (G-02,
 * G-03, 03 § 3.1, § 5.2).
 */
export function PageLoadError() {
  const { failed, fromCache, retry } = usePublicReadStatus();
  return failed ? <LoadErrorBox fromCache={fromCache} onRetry={retry} /> : null;
}

interface PageColumnProps {
  restaurant: Restaurant;
  /** Calendar and day card of the restaurant, in the order of 05 § 1. */
  children: ReactNode;
}

/** Column of `restaurant` with the names of the state shown (05 § 1). */
export function PageColumn({ restaurant, children }: PageColumnProps) {
  return (
    <Column restaurant={restaurant} {...columnTexts(usePageTexts(), restaurant)}>
      {children}
    </Column>
  );
}
