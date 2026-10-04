import { ColumnSkeleton } from "@/features/page/ColumnSkeleton";
import { useSkeletonTexts } from "@/features/page/page-texts";
import { PageLayout } from "@/features/page/PageLayout";

/**
 * The page before any data (G-01, 03 § 3): header, titles and descriptions, a skeleton in each column, no
 * « Chargement » text. Prerendered in the shell (pending component): while React hydrates it renders exactly the
 * prerendered markup, with the default titles; then the titles of the last visit (03 § 1.2).
 */
export function PageSkeleton() {
  const texts = useSkeletonTexts();
  return <PageLayout texts={texts} busy r1={<ColumnSkeleton />} r2={<ColumnSkeleton />} />;
}
