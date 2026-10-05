import { Column } from "@/features/page/Column";
import { ColumnSkeleton } from "@/features/page/ColumnSkeleton";
import { Header } from "@/features/page/Header";
import { columnTexts, useSkeletonTexts } from "@/features/page/page-texts";
import type { PageTexts } from "@/features/page/page-texts";
import { Columns, Main, PageLayout } from "@/features/page/PageLayout";

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
 * The page before any data (G-01, 03 § 3): header, titles and descriptions, a skeleton in each column, no
 * « Chargement » text. Prerendered in the shell (pending component): while React hydrates it renders exactly the
 * prerendered markup, with the default titles; then the titles of the last visit (03 § 1.2). `Page` renders the same
 * markup while React hydrates (arbitrage 16).
 */
export function PageSkeleton() {
  const texts = useSkeletonTexts();
  return (
    <PageLayout>
      <Header texts={texts} />
      <Main busy>
        <SkeletonColumns texts={texts} />
      </Main>
    </PageLayout>
  );
}
