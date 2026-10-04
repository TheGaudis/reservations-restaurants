import { useRouter } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";

import { ColumnSkeleton } from "@/features/page/ColumnSkeleton";
import { LoadErrorBox } from "@/features/page/LoadErrorBox";
import { useSkeletonTexts } from "@/features/page/page-texts";
import { PageLayout } from "@/features/page/PageLayout";

/**
 * Error component of the routes (PLAN § 3.9): the page without data, its skeleton stopped, and the load error box
 * (G-03). « Réessayer » runs the loaders again.
 */
export function LoadErrorPage({ reset }: ErrorComponentProps) {
  const router = useRouter();
  const texts = useSkeletonTexts();
  const retry = async () => {
    reset();
    await router.invalidate();
  };
  return (
    <PageLayout
      texts={texts}
      busy={false}
      alert={<LoadErrorBox fromCache={false} onRetry={retry} />}
      r1={<ColumnSkeleton still />}
      r2={<ColumnSkeleton still />}
    />
  );
}
