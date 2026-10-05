import type { ReactNode } from "react";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";

import styles from "@/ui/print/PrintLayout.module.css";

const messages = defineMessages({
  logoAlt: {
    id: "print.layout.logoAlt",
    defaultMessage: "Lycée Aristide Briand",
    description: "07 § 2.2 — texte de remplacement du logo de l'en-tête imprimé",
  },
});

/** One information of the header (`.pb-meta`, 07 § 2.2): label and value; `wide` for the menu. */
export interface PrintInfo {
  key: string;
  label: ReactNode;
  value: ReactNode;
  wide?: boolean | undefined;
}

interface PrintLayoutProps {
  /** Colours of the restaurant (07 § 2.3). */
  accent: "r1" | "r2";
  /** Source of the logo of the header. */
  logo: string;
  /** Time of the click, in ms: « Imprimé le {date} » (07 § 2.2). */
  printedAt: number;
  /** `h1`: the restaurant's name. */
  heading: string;
  /** Under the title: the date, capitalised by CSS. */
  subtitle: string;
  /**
   * The date as an `h2`, same look: a document whose sections are `h3` (document D, 07 § 7) keeps its heading levels
   * in sequence (axe `heading-order`, PLAN § 1.5, S5).
   */
  subtitleHeading?: boolean | undefined;
  /** Informations with a value, in order; none: no frame. */
  infos?: readonly PrintInfo[] | undefined;
  /** `.pb-total`: label on the left, value on the right. */
  total?: { label: ReactNode; value: ReactNode } | undefined;
  /** « Nom du responsable » and « Signature » with their writing lines. */
  signature?: boolean | undefined;
  /** Tables or message of the document. */
  children: ReactNode;
}

const NO_INFOS: readonly PrintInfo[] = [];

/** Stripe and header: logo, name of the school on two lines, date of printing (07 § 2.2). */
function PrintHeader({ logo, printedAt }: { logo: string; printedAt: number }) {
  const intl = useIntl();
  return (
    <>
      <div className={styles["stripe"]} />
      <header className={styles["head"]}>
        <img className={styles["logo"]} src={logo} alt={intl.formatMessage(messages.logoAlt)} />
        <p className={styles["school"]}>
          <FormattedMessage
            id="print.layout.school"
            defaultMessage="Lycée professionnel Aristide Briand"
            description="07 § 2.2 — en-tête imprimé, première ligne"
          />
          <br />
          <FormattedMessage
            id="print.layout.restaurants"
            defaultMessage="Restaurants pédagogiques"
            description="07 § 2.2 — en-tête imprimé, seconde ligne"
          />
        </p>
        <p className={styles["printedOn"]}>
          <FormattedMessage
            id="print.layout.printedOn"
            defaultMessage="Imprimé le {date}"
            description="07 § 2.2 — date d'impression à droite de l'en-tête (« Imprimé le 3 octobre 2026 »)"
            values={{ date: intl.formatDate(printedAt, { format: "printedOn" }) }}
          />
        </p>
      </header>
    </>
  );
}

/** « Nom du responsable » and « Signature », each followed by its writing line (07 § 2.2). */
function PrintSignature() {
  return (
    <div className={styles["signature"]}>
      <p>
        <FormattedMessage
          id="print.layout.signatory"
          defaultMessage="Nom du responsable"
          description="07 § 2.2 — intitulé de la signature, à gauche"
        />
      </p>
      <p>
        <FormattedMessage
          id="print.layout.signature"
          defaultMessage="Signature"
          description="07 § 2.2 — intitulé de la signature, à droite"
        />
      </p>
    </div>
  );
}

/**
 * Common frame of the printed documents (07 § 2.2, `printDoc`), from top to bottom: stripe, header with the logo and
 * the date of printing, title with the mark of the restaurant, date, informations, body, total, signature. The footer
 * prints in the page margin (styles/print.css), not here.
 */
export function PrintLayout({
  accent,
  logo,
  printedAt,
  heading,
  subtitle,
  subtitleHeading = false,
  infos = NO_INFOS,
  total,
  signature = false,
  children,
}: PrintLayoutProps) {
  return (
    <article className={styles["document"]} data-print-accent={accent}>
      <PrintHeader logo={logo} printedAt={printedAt} />
      <h1 className={styles["title"]}>{heading}</h1>
      {subtitleHeading ? (
        <h2 className={styles["subtitle"]}>{subtitle}</h2>
      ) : (
        <p className={styles["subtitle"]}>{subtitle}</p>
      )}
      {infos.length > 0 ? (
        <dl className={styles["infos"]}>
          {infos.map((info) => (
            <div
              key={info.key}
              className={styles["info"]}
              data-wide={info.wide === true || undefined}
            >
              <dt>{info.label}</dt>
              <dd>{info.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {children}
      {total === undefined ? null : (
        <p className={styles["total"]}>
          <span>{total.label}</span>
          <b>{total.value}</b>
        </p>
      )}
      {signature ? <PrintSignature /> : null}
    </article>
  );
}

/** A message in place of the tables (`.pb-note`): « Ce jour n'est plus ouvert. », « Aucun jour ouvert pour demain. » */
export function PrintNote({ children }: { children: ReactNode }) {
  return <p className={styles["note"]}>{children}</p>;
}
