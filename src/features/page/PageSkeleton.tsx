import styles from "@/features/page/PageSkeleton.module.css";

/**
 * Skeleton of both columns (G-01), prerendered in the shell and shown for at least pendingMinMs (PLAN arbitrage 16).
 * No text: 03 § 3 shows no "Chargement" message.
 */
export function PageSkeleton() {
  return (
    <main className={styles["page"]} aria-busy="true">
      <div className={styles["column"]} data-accent="r1" aria-hidden="true">
        <span className={`${styles["block"]} ${styles["title"]}`} />
        <span className={styles["block"]} />
      </div>
      <div className={styles["column"]} data-accent="r2" aria-hidden="true">
        <span className={`${styles["block"]} ${styles["title"]}`} />
        <span className={styles["block"]} />
      </div>
    </main>
  );
}
