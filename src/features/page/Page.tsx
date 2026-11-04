import type { ReactNode } from "react";

import { LoadErrorBox } from "@/features/page/LoadErrorBox";
import { usePageTexts } from "@/features/page/page-texts";
import { PageMain } from "@/features/page/PageSkeleton";
import { useLoadedAppState, usePublicReadStatus } from "@/queries/use-app-state";

const hasState = () => true;

interface PageProps {
  /** Staff panels, above the load error box (06 § 2). */
  top?: ReactNode;
  /** Calendar and day card of R1, in the order of 05 § 1. */
  r1: ReactNode;
  r2: ReactNode;
}

/**
 * `<main>` of both modes (PLAN § 3.2), composed by `PublicPage` and `StaffPage` under the header of the root, once the
 * loader of the route is done: the first read has answered or failed (G-01, G-03). The columns show their content
 * once the state shown is there; after a failed first read, their skeleton with the shimmer stopped (G-03, 03 § 3),
 * until a later read succeeds. The load error box stays while no read has succeeded since the page loaded, with
 * « Réessayer » (03 § 5.2).
 */
export function Page({ top, r1, r2 }: PageProps) {
  const texts = usePageTexts();
  const loaded = useLoadedAppState(hasState) === true;
  const { failed, fromCache, retry } = usePublicReadStatus();
  return (
    <PageMain
      texts={texts}
      top={
        <>
          {top}
          {failed ? <LoadErrorBox fromCache={fromCache} onRetry={retry} /> : null}
        </>
      }
      columns={loaded ? { r1, r2 } : undefined}
      still
    />
  );
}
