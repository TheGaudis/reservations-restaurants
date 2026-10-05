import type { ReactNode } from "react";

import type { Restaurant } from "@/domain/types";
import { Column } from "@/features/page/Column";
import { ColumnSkeleton } from "@/features/page/ColumnSkeleton";
import { LoadErrorBox } from "@/features/page/LoadErrorBox";
import { columnTexts, usePageTexts } from "@/features/page/page-texts";
import { useLoadedAppState, usePublicReadStatus } from "@/queries/use-app-state";

// Pieces of the `<main>` of both modes (PLAN § 3.2), composed by `PublicPage` and `StaffPage` under the header of the
// root. The route renders them once its loader is done: on / the first read has answered or failed (G-01, G-03).

const hasState = () => true;

/** Load error box while no read has succeeded since the page loaded, with « Réessayer » (G-03, 03 § 3, § 5.2). */
export function PageLoadError() {
  const { failed, fromCache, retry } = usePublicReadStatus();
  return failed ? <LoadErrorBox fromCache={fromCache} onRetry={retry} /> : null;
}

interface PageColumnProps {
  restaurant: Restaurant;
  /** Calendar and day card of the restaurant, in the order of 05 § 1. */
  children: ReactNode;
}

/**
 * Column of `restaurant`: its content once the state shown is there; after a failed first read, its skeleton with the
 * shimmer stopped (G-03, 03 § 3), until a later read succeeds.
 */
export function PageColumn({ restaurant, children }: PageColumnProps) {
  const texts = usePageTexts();
  const loaded = useLoadedAppState(hasState) === true;
  return (
    <Column restaurant={restaurant} {...columnTexts(texts, restaurant)}>
      {loaded ? children : <ColumnSkeleton still />}
    </Column>
  );
}
