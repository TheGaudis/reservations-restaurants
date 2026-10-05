import { useRouter } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";

import { Header } from "@/features/page/Header";
import { LoadErrorBox } from "@/features/page/LoadErrorBox";
import { useSkeletonTexts } from "@/features/page/page-texts";
import { Main, PageLayout } from "@/features/page/PageLayout";
import { SkeletonColumns } from "@/features/page/PageSkeleton";

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
    <PageLayout>
      <Header texts={texts} />
      <Main busy={false}>
        <LoadErrorBox fromCache={false} onRetry={retry} />
        <SkeletonColumns texts={texts} still />
      </Main>
    </PageLayout>
  );
}
