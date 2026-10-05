import type { ReactNode } from "react";

import type { Restaurant } from "@/domain/types";
import { Column } from "@/features/page/Column";
import { ColumnSkeleton } from "@/features/page/ColumnSkeleton";
import { Header } from "@/features/page/Header";
import { LoadErrorBox } from "@/features/page/LoadErrorBox";
import { columnTexts, usePageTexts } from "@/features/page/page-texts";
import { Main, PageLayout } from "@/features/page/PageLayout";
import { useHydrated } from "@/features/page/use-hydrated";
import { AutoRefresh } from "@/queries/AutoRefresh";
import { useLoadedAppState, usePublicReadStatus } from "@/queries/use-app-state";

// The page of both modes (PLAN § 3.2), composed by `PublicPage` and `StaffPage`:
//
//   <Page>
//     <PageHeader>{mode switch}</PageHeader>
//     <PageMain>
//       <WhenLoaded>{staff panels}</WhenLoaded>
//       <PageLoadError />
//       <Columns>
//         <PageColumn restaurant="r1">{calendar, card}</PageColumn>
//         <PageColumn restaurant="r2">{calendar, card}</PageColumn>
//       </Columns>
//     </PageMain>
//   </Page>
//
// Each piece reads the state of the page through `usePageStatus` and shows its skeleton, its content or nothing.
// While React hydrates the prerendered shell, they render exactly the markup of `PageSkeleton`, even with a local
// copy (client-only barrier, arbitrage 16): this is what allows `pendingMinMs: 0` on the route `/`. The same
// elements then show the data: the header and the logo are never mounted twice.

const hasState = () => true;

interface PageStatus {
  /** The state shown is there: the columns show their content (G-02, G-04). */
  loaded: boolean;
  /** The first read failed: load error box, skeleton stopped (G-03, 03 § 3); a local copy stays on screen. */
  failed: boolean;
}

/** Both false while React hydrates, whatever the cache holds (arbitrage 16). */
function usePageStatus(): PageStatus {
  const hydrated = useHydrated();
  const hasData = useLoadedAppState(hasState) === true;
  const { failed } = usePublicReadStatus();
  return { loaded: hasData && hydrated, failed: failed && hydrated };
}

/** Frame of the page; `AutoRefresh` is mounted here, once (PLAN § 3.3.2). */
export function Page({ children }: { children: ReactNode }) {
  return (
    <>
      <PageLayout>{children}</PageLayout>
      <AutoRefresh />
    </>
  );
}

/** Header with the texts of the state shown; `children` (the mode switch) once React hydrated. */
export function PageHeader({ children }: { children?: ReactNode }) {
  const hydrated = useHydrated();
  const texts = usePageTexts();
  return <Header texts={texts}>{hydrated ? children : null}</Header>;
}

/** `<main>`, busy until the first read answers (03 § 3). */
export function PageMain({ children }: { children: ReactNode }) {
  const { loaded, failed } = usePageStatus();
  return <Main busy={!loaded && !failed}>{children}</Main>;
}

/** `children` once the state shown is there; nothing before (staff panels, 06 § 2). */
export function WhenLoaded({ children }: { children: ReactNode }): ReactNode {
  return usePageStatus().loaded ? children : null;
}

/** Load error box after a failed first read, with « Réessayer » (G-03, 03 § 3, § 5.2). */
export function PageLoadError() {
  const { failed } = usePageStatus();
  const { fromCache, retry } = usePublicReadStatus();
  return failed ? <LoadErrorBox fromCache={fromCache} onRetry={retry} /> : null;
}

interface PageColumnProps {
  restaurant: Restaurant;
  /** Calendar and day card of the restaurant, in the order of 05 § 1. */
  children: ReactNode;
}

/** Column of `restaurant`: its content once the state shown is there, its skeleton before (G-01). */
export function PageColumn({ restaurant, children }: PageColumnProps) {
  const texts = usePageTexts();
  const { loaded, failed } = usePageStatus();
  return (
    <Column restaurant={restaurant} {...columnTexts(texts, restaurant)}>
      {loaded ? children : <ColumnSkeleton still={failed} />}
    </Column>
  );
}
