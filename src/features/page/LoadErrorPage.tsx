import { useRouter } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";

import { LoadErrorBox } from "@/features/page/LoadErrorBox";
import { useSkeletonTexts } from "@/features/page/page-texts";
import { PageMain } from "@/features/page/PageSkeleton";

/**
 * Error component of the routes (PLAN § 3.9), under the header of the root: `<main>` without data, its skeleton
 * stopped, and the load error box (G-03). « Réessayer » runs the loaders again.
 */
export function LoadErrorPage({ reset }: ErrorComponentProps) {
  const router = useRouter();
  const retry = async () => {
    reset();
    await router.invalidate();
  };
  return (
    <PageMain
      texts={useSkeletonTexts()}
      top={<LoadErrorBox fromCache={false} onRetry={retry} />}
      still
    />
  );
}
