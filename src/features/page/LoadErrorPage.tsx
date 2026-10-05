import { useRouter } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useEffect } from "react";

import { LoadErrorBox } from "@/features/page/LoadErrorBox";
import { useSkeletonTexts } from "@/features/page/page-texts";
import { Main } from "@/features/page/PageLayout";
import { SkeletonColumns } from "@/features/page/PageSkeleton";
import { FirstReadError } from "@/queries/first-read";
import { usePublicReadStatus } from "@/queries/use-app-state";

/**
 * « Réessayer » of the box. After a failed first read: one read of the script, the box staying until it settles
 * (03 § 3.2, REG-04). After any other error (rendering, full state of /collegue): the loaders run again.
 */
function useRetry({ error, reset }: ErrorComponentProps): () => Promise<unknown> {
  const router = useRouter();
  const { loaded, retry } = usePublicReadStatus();
  const firstRead = error instanceof FirstReadError;
  // The error boundary of the route keeps its error in its own state: once a read succeeds, from « Réessayer » or from
  // `AutoRefresh`, the page takes the place of the box (03 § 3.2, § 5.2).
  useEffect(() => {
    if (firstRead && loaded) reset();
  }, [firstRead, loaded, reset]);
  if (firstRead) return retry;
  return async () => {
    reset();
    await router.invalidate();
  };
}

/**
 * Error component of the routes (PLAN § 3.9), under the header of the root: `<main>` without data, its skeleton
 * stopped, and the load error box (G-03). A navigation keeps it: the page throws the same failure again without
 * reading the script (`useFirstReadOrThrow`).
 */
export function LoadErrorPage(props: ErrorComponentProps) {
  const texts = useSkeletonTexts();
  const retry = useRetry(props);
  return (
    <Main busy={false}>
      <LoadErrorBox fromCache={false} onRetry={retry} />
      <SkeletonColumns texts={texts} still />
    </Main>
  );
}
