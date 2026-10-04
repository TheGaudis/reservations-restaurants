import type { ReactNode } from "react";

import { ColumnSkeleton } from "@/features/page/ColumnSkeleton";
import { LoadErrorBox } from "@/features/page/LoadErrorBox";
import { usePageTexts } from "@/features/page/page-texts";
import { PageLayout } from "@/features/page/PageLayout";
import { useHydrated } from "@/features/page/use-hydrated";
import { AutoRefresh } from "@/queries/AutoRefresh";
import { useLoadedAppState, usePublicReadStatus } from "@/queries/use-app-state";

/** Content of a column once data is there, in the order of 05 § 1. */
interface ColumnSlots {
  /** « Ouvrir un jour » (staff mode, 06 § 4). */
  admin?: ReactNode;
  /** Calendar of the restaurant (05 § 2-3). */
  calendar?: ReactNode;
  /** Summary, then the card of the selected day with its forms (05 § 4-6). */
  card?: ReactNode;
}

export interface PageProps {
  /** « Client / Collègue » in the header (06 § 1.1). */
  modeSwitch?: ReactNode;
  /** Staff panels above the columns (06 § 2). */
  panels?: ReactNode;
  r1?: ColumnSlots;
  r2?: ColumnSlots;
}

const hasState = () => true;

function columnContent(slots: ColumnSlots | undefined): ReactNode {
  return (
    <>
      {slots?.admin}
      {slots?.calendar}
      {slots?.card}
    </>
  );
}

/**
 * The two-column page of both modes (PLAN § 3.2): `PublicPage` and `StaffPage` fill the slots. Before any data the
 * columns keep their skeleton; a failed read shows the load error box, stops the skeleton and the page keeps
 * refreshing (03 § 3, § 5.2). `AutoRefresh` is mounted here, once.
 *
 * While React hydrates the prerendered shell, the page renders exactly the markup of `PageSkeleton`, even with a
 * local copy (client-only barrier, arbitrage 16): this is what allows `pendingMinMs: 0` on its route. The same
 * elements then show the data: the header and the logo are never mounted twice.
 */
export function Page({ modeSwitch, panels, r1, r2 }: PageProps) {
  const hydrated = useHydrated();
  const texts = usePageTexts();
  const loaded = useLoadedAppState(hasState) === true && hydrated;
  const status = usePublicReadStatus();
  const failed = status.failed && hydrated;
  const { fromCache, retry } = status;
  return (
    <>
      <PageLayout
        texts={texts}
        busy={!loaded && !failed}
        // Not in the prerendered skeleton: rendered once React hydrated (client-only barrier).
        modeSwitch={hydrated ? modeSwitch : undefined}
        panels={loaded ? panels : undefined}
        alert={failed ? <LoadErrorBox fromCache={fromCache} onRetry={retry} /> : null}
        r1={loaded ? columnContent(r1) : <ColumnSkeleton still={failed} />}
        r2={loaded ? columnContent(r2) : <ColumnSkeleton still={failed} />}
      />
      <AutoRefresh />
    </>
  );
}
