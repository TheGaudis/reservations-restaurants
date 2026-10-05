import { useRef } from "react";
import type { ReactNode } from "react";
import { FormattedMessage, useIntl, defineMessages } from "react-intl";

import { LOGO_CLICK_WINDOW_MS, LOGO_CLICKS } from "@/domain/constants";
import logoUrl from "@/features/page/logo.png";
import type { PageTexts } from "@/features/page/page-texts";

import styles from "@/features/page/Header.module.css";

const messages = defineMessages({
  logo: {
    id: "common.page.logoAlt",
    defaultMessage: "Lycée Aristide Briand",
    description: "08 § 7.2 — texte de remplacement du logo",
  },
});

// Easter egg of the old site (D-01, 09 § 7).
const VIDEO_URL = "https://youtu.be/dQw4w9WgXcQ?list=RDdQw4w9WgXcQ";

/** Five clicks on the logo within 2 s open the video in a new tab (D-01). Times kept in a ref: nothing renders. */
function useEasterEgg(): () => void {
  const clicks = useRef<number[]>([]);
  return () => {
    const now = Date.now();
    clicks.current = [...clicks.current.filter((time) => now - time < LOGO_CLICK_WINDOW_MS), now];
    if (clicks.current.length < LOGO_CLICKS) return;
    clicks.current = [];
    window.open(VIDEO_URL, "_blank", "noopener");
  };
}

interface HeaderProps {
  texts: PageTexts;
  /** « Client / Collègue » and the login panel (06 § 1.1), on the right of the header. */
  children?: ReactNode;
}

/** Header of the page (04 § 2, 08 § 7.2): logo, school, title derived from `name2` (D-24), subtitle. */
export function Header({ texts, children }: HeaderProps) {
  const intl = useIntl();
  const onLogoClick = useEasterEgg();
  return (
    <header className={styles["header"]}>
      <div className={styles["brand"]}>
        <img
          onClick={onLogoClick}
          className={styles["logo"]}
          src={logoUrl}
          width={161}
          height={144}
          alt={intl.formatMessage(messages.logo)}
        />
        <div className={styles["text"]}>
          <span className={`kicker ${styles["kicker"]}`}>
            <FormattedMessage
              id="common.page.kicker"
              defaultMessage="Lycée professionnel Aristide Briand"
              description="03 § 2.2, 04 § 2 — surtitre de l'en-tête"
            />
          </span>
          <h1 className={styles["title"]}>
            <FormattedMessage
              id="public.header.title"
              defaultMessage="Réservations des restaurants pédagogiques et {name2}"
              description="PLAN annexe F, D-24 — titre de la page, dérivé du nom du restaurant 2"
              values={{ name2: texts.name2 }}
            />
          </h1>
          <p className={styles["subtitle"]}>
            <FormattedMessage
              id="common.page.subtitle"
              defaultMessage="Table côté {name1} · Plats à emporter ou sur place côté {name2}"
              description="04 § 2, 03 § 2.2 — sous-titre de l'en-tête"
              values={{ name1: texts.name1, name2: texts.name2 }}
            />
          </p>
        </div>
      </div>
      {children === undefined || children === null ? null : (
        <div className={styles["mode"]}>{children}</div>
      )}
    </header>
  );
}
