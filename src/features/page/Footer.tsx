import { FormattedMessage } from "react-intl";

import styles from "@/features/page/Footer.module.css";

/** Foot of the page (04 § 2, 08 § 4.17, § 7.1). */
export function Footer() {
  return (
    <footer className={styles["footer"]}>
      <p className={styles["note"]}>
        <FormattedMessage
          id="common.page.footNote"
          defaultMessage="Les places se mettent à jour automatiquement toutes les 3 minutes. Vous pouvez aussi actualiser la page."
          description="00 § 2.3, 04 § 2 — pied de page"
        />
      </p>
      <p className={styles["signature"]}>
        <FormattedMessage
          id="common.page.signature"
          defaultMessage="Lycée professionnel Aristide Briand · Restaurants pédagogiques"
          description="03 § 2.2, 08 § 4.17 — signature tricolore du pied de page"
        />
      </p>
    </footer>
  );
}
