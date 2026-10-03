import { getRouteApi } from "@tanstack/react-router";

import { PageSkeleton } from "@/features/page/PageSkeleton";
import { useHydrated } from "@/features/page/use-hydrated";

import styles from "@/features/page/PageSkeleton.module.css";

const routeApi = getRouteApi("/");

/** Shell of the public page: restaurant names from the local copy, the skeleton until a state exists. */
export function PublicPage() {
  const state = routeApi.useLoaderData();
  const hydrated = useHydrated();
  // While hydrating, render exactly the prerendered skeleton (route option pendingMinMs: 0).
  if (!hydrated || state === null) return <PageSkeleton />;
  return (
    <main className={styles["page"]}>
      <section className={styles["column"]} data-accent="r1">
        <h2>{state.settings.name1}</h2>
      </section>
      <section className={styles["column"]} data-accent="r2">
        <h2>{state.settings.name2}</h2>
      </section>
    </main>
  );
}
