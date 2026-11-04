import type { ReactNode } from "react";
import { defineMessage, FormattedMessage, useIntl } from "react-intl";
import type { IntlShape } from "react-intl";

import type { IsoDate } from "@/domain/types";
import logoUrl from "@/features/page/logo.png";
import { formatLongDate } from "@/intl/dates";

import styles from "@/features/print/PrintFrame.module.css";

// Frame of the four printed documents (07 § 2.2, `printDoc` of legacy/js/impression.js) and the pieces that both
// restaurants print. The footer prints in the page margin (styles/print.css), not here.

const logoAltMessage = defineMessage({
  id: "print.layout.logoAlt",
  defaultMessage: "Lycée Aristide Briand",
  description: "07 § 2.2 — texte de remplacement du logo de l'en-tête imprimé",
});

const dotMessage = defineMessage<{ before: string; after: string }>({
  id: "print.total.dot",
  defaultMessage: "{before} · {after}",
  description:
    "07 § 3, § 4, § 6, § 7 — séparateur des parties d'un total (« 12 couverts · 67,80 € »)",
});

export const nameColumn = defineMessage({
  id: "print.column.name",
  defaultMessage: "Nom",
  description: "07 § 3, § 4, § 6, § 7 — colonne des tableaux",
});

export const priceColumn = defineMessage({
  id: "print.column.price",
  defaultMessage: "Prix",
  description: "07 § 3, § 4, § 6, § 7 — colonne des tableaux",
});

/** Non-empty `parts` joined two by two with `join` (« 8 élèves, 3 personnels »). */
export function joinParts(
  parts: readonly string[],
  join: (before: string, after: string) => string,
): string {
  const [first = "", ...rest] = parts.filter((part) => part !== "");
  return rest.reduce(join, first);
}

/** Parts of a total joined by « · », empty parts left out (07 § 3: « 12 couverts · 8 élèves… · 67,80 € »). */
export function dotted(intl: IntlShape, parts: readonly string[]): string {
  return joinParts(parts, (before, after) => intl.formatMessage(dotMessage, { before, after }));
}

interface PrintFrameProps {
  /** Colours of the restaurant (07 § 2.3, `data-print-accent` of styles/print.css). */
  accent: "r1" | "r2";
  /** Time of the click, in ms: « Imprimé le {date} » (07 § 2.2). */
  printedAt: number;
  /** `h1`: the restaurant's name. */
  heading: string;
  iso: IsoDate;
  /** Summary of tomorrow (07 § 6, § 7): « Demain, {date} » under the title. */
  tomorrow: boolean;
  /**
   * The date as an `h2`, same look: document D, whose sections are `h3`, keeps its heading levels in sequence (axe
   * `heading-order`, PLAN § 1.5, S5).
   */
  dateHeading?: boolean | undefined;
  /** `PrintInfo` items, in order; undefined: no frame. */
  infos?: ReactNode;
  /** « Nom du responsable » and « Signature » with their writing lines. */
  signature: boolean;
  /** Tables or message of the document, then its total. */
  children: ReactNode;
}

/**
 * From top to bottom: stripe, header with the logo and the date of printing, title with the mark of the restaurant,
 * date, informations, body, signature (07 § 2.2).
 */
export function PrintFrame(props: PrintFrameProps) {
  const intl = useIntl();
  const date = formatLongDate(props.iso);
  const subtitle = props.tomorrow ? (
    <FormattedMessage
      id="print.tomorrow.subtitle"
      defaultMessage="Demain, {date}"
      description="07 § 6, § 7 — sous-titre du résumé du lendemain"
      values={{ date }}
    />
  ) : (
    date
  );
  return (
    <article className={styles["document"]} data-print-accent={props.accent}>
      <div className={styles["stripe"]} />
      <header className={styles["head"]}>
        <img className={styles["logo"]} src={logoUrl} alt={intl.formatMessage(logoAltMessage)} />
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
            values={{ date: intl.formatDate(props.printedAt, { format: "printedOn" }) }}
          />
        </p>
      </header>
      <h1 className={styles["title"]}>{props.heading}</h1>
      {props.dateHeading === true ? (
        <h2 className={styles["subtitle"]}>{subtitle}</h2>
      ) : (
        <p className={styles["subtitle"]}>{subtitle}</p>
      )}
      {props.infos === undefined ? null : <dl className={styles["infos"]}>{props.infos}</dl>}
      {props.children}
      {props.signature ? (
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
      ) : null}
    </article>
  );
}

/** One information of the header (`.pb-meta`, 07 § 2.2); `wide` for the menu. */
export function PrintInfo(props: { label: ReactNode; wide?: boolean; children: ReactNode }) {
  return (
    <div className={styles["info"]} data-wide={props.wide === true || undefined}>
      <dt>{props.label}</dt>
      <dd>{props.children}</dd>
    </div>
  );
}

/** « Ouvert par »: the colleague's name, or « Non renseigné » (07 § 3, § 4, § 6, § 7). */
export function OpenedByInfo({ openedBy }: { openedBy: string }) {
  return (
    <PrintInfo
      label={
        <FormattedMessage
          id="print.info.openedBy"
          defaultMessage="Ouvert par"
          description="07 § 3, § 4, § 6, § 7 — intitulé d'une information du document"
        />
      }
    >
      {openedBy === "" ? (
        <FormattedMessage
          id="print.info.openedBy.none"
          defaultMessage="Non renseigné"
          description="07 § 3, § 4 — « Ouvert par » d'un jour ouvert sans nom"
        />
      ) : (
        openedBy
      )}
    </PrintInfo>
  );
}

/** `.pb-total`: label on the left, value on the right; « Total » by default (07 § 3, § 6, § 7). */
export function PrintTotal(props: { label?: ReactNode; children: string }) {
  return (
    <p className={styles["total"]}>
      <span>
        {props.label ?? (
          <FormattedMessage
            id="print.total.label"
            defaultMessage="Total"
            description="07 § 3, § 6, § 7 — intitulé du total"
          />
        )}
      </span>
      <b>{props.children}</b>
    </p>
  );
}

/** A message in place of the tables (`.pb-note`). */
export function PrintNote({ children }: { children: ReactNode }) {
  return <p className={styles["note"]}>{children}</p>;
}

/** « Aucun jour ouvert pour demain. » (07 § 6, § 7). */
export function NoDayTomorrowNote() {
  return (
    <PrintNote>
      <FormattedMessage
        id="print.tomorrow.noDay"
        defaultMessage="Aucun jour ouvert pour demain."
        description="07 § 6, § 7 — résumé du lendemain sans jour ouvert"
      />
    </PrintNote>
  );
}

/** Single centred italic row of an empty table (07 § 2.4). */
export function NoBookingsRow({ columns }: { columns: number }) {
  return (
    <tr>
      <td className={styles["empty"]} colSpan={columns}>
        <FormattedMessage
          id="print.table.noBookings"
          defaultMessage="Aucune réservation."
          description="07 § 3, § 4, § 6, § 7 — tableau sans réservation"
        />
      </td>
    </tr>
  );
}
