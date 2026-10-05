import type { ReactNode } from "react";

import { ConfigBanner } from "@/features/page/ConfigBanner";
import { DevDataBanner } from "@/features/page/DevDataBanner";
import { Footer } from "@/features/page/Footer";

import styles from "@/features/page/PageLayout.module.css";

// Frame of every page (08 § 7.1): banners, tricolour stripe, then the header and `Main` given as children, foot.
// The root route mounts it once, around the routes (routes/__root.tsx).

/** Banners, tricolour stripe, then `children` (header, main) and the foot. */
export function PageLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ConfigBanner />
      <DevDataBanner />
      <div className={styles["stripe"]} aria-hidden="true" />
      <div className={styles["wrap"]}>
        {children}
        <Footer />
      </div>
    </>
  );
}

interface MainProps {
  /** No data yet: the columns show their skeleton (`aria-busy`, 03 § 3). */
  busy: boolean;
  /** Staff panels, load error box, then `Columns` (08 § 7.1). */
  children: ReactNode;
}

export function Main({ busy, children }: MainProps) {
  return (
    <main className={styles["main"]} aria-busy={busy}>
      {children}
    </main>
  );
}

/** The two columns side by side (08 § 7.3). */
export function Columns({ children }: { children: ReactNode }) {
  return <div className={styles["columns"]}>{children}</div>;
}
