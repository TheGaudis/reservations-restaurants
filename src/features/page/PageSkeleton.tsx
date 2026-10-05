import { Column } from "@/features/page/Column";
import { ColumnSkeleton } from "@/features/page/ColumnSkeleton";
import { columnTexts, useDefaultTexts, useSkeletonTexts } from "@/features/page/page-texts";
import type { PageTexts } from "@/features/page/page-texts";
import { Columns, Main } from "@/features/page/PageLayout";

interface SkeletonColumnsProps {
  texts: PageTexts;
  /** Load failure: the shimmer stops (03 § 3, 08 § 4.16). */
  still?: boolean;
}

/** Both columns with their titles and a skeleton in place of the calendar and the card (G-01, G-03). */
export function SkeletonColumns({ texts, still = false }: SkeletonColumnsProps) {
  return (
    <Columns>
      <Column restaurant="r1" {...columnTexts(texts, "r1")}>
        <ColumnSkeleton still={still} />
      </Column>
      <Column restaurant="r2" {...columnTexts(texts, "r2")}>
        <ColumnSkeleton still={still} />
      </Column>
    </Columns>
  );
}

/**
 * `<main>` before any data (G-01, 03 § 3): titles and descriptions of the last visit (03 § 1.2) or the defaults, a
 * skeleton in each column, no « Chargement » text. Pending component of the routes, under the header of the root.
 */
export function PageSkeleton() {
  return (
    <Main busy>
      <SkeletonColumns texts={useSkeletonTexts()} />
    </Main>
  );
}

/** The same `<main>` in the prerendered shell, with the default titles: Node has no storage to read. */
export function ShellSkeleton() {
  return (
    <Main busy>
      <SkeletonColumns texts={useDefaultTexts()} />
    </Main>
  );
}
