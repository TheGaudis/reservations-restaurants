import type { ReactNode } from "react";

import { Column } from "@/features/page/Column";
import { ConfigBanner } from "@/features/page/ConfigBanner";
import { DevDataBanner } from "@/features/page/DevDataBanner";
import { Footer } from "@/features/page/Footer";
import { Header } from "@/features/page/Header";
import type { PageTexts } from "@/features/page/page-texts";

import styles from "@/features/page/PageLayout.module.css";

interface PageLayoutProps {
  texts: PageTexts;
  /** No data yet: the columns show their skeleton (`aria-busy`, 03 § 3). */
  busy: boolean;
  modeSwitch?: ReactNode;
  /** Staff panels above the columns (06 § 2). */
  panels?: ReactNode;
  /** Load error box (G-03). */
  alert?: ReactNode;
  r1: ReactNode;
  r2: ReactNode;
}

/** Order of the page (08 § 7.1): banners, tricolour stripe, header, panels, load error, two columns, foot. */
export function PageLayout({ texts, busy, modeSwitch, panels, alert, r1, r2 }: PageLayoutProps) {
  return (
    <>
      <ConfigBanner />
      <DevDataBanner />
      <div className={styles["stripe"]} aria-hidden="true" />
      <div className={styles["wrap"]}>
        <Header texts={texts} modeSwitch={modeSwitch} />
        <main className={styles["main"]} aria-busy={busy}>
          {panels}
          {alert}
          <div className={styles["columns"]}>
            <Column restaurant="r1" title={texts.name1} description={texts.desc1}>
              {r1}
            </Column>
            <Column restaurant="r2" title={texts.name2} description={texts.desc2}>
              {r2}
            </Column>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
