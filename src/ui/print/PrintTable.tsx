import type { ReactNode } from "react";

import styles from "@/ui/print/PrintTable.module.css";

/** A column (07 § 2.4): `end` for numbers (right, tabular figures, no wrap), `center` for centred counts. */
export interface PrintColumn {
  key: string;
  label: ReactNode;
  align?: "start" | "center" | "end" | undefined;
  /** Class of the header and of every cell of the column: width and style, from the document's CSS. */
  className?: string | undefined;
}

/** A group header above the columns (grid variant, 07 § 2.4): its label spans `span` columns. */
export interface PrintColumnGroup {
  key: string;
  label: ReactNode;
  span: number;
  center?: boolean | undefined;
}

/** A cell with a tone of its own: `muted` (« – » greyed), `marked` (observation, tinted with a rule on the left). */
export interface PrintCell {
  content: ReactNode;
  tone?: "muted" | "marked" | undefined;
}

export interface PrintRow {
  key: string;
  /** One per column, in the same order. */
  cells: ReadonlyArray<ReactNode | PrintCell>;
}

interface PrintTableProps {
  columns: readonly PrintColumn[];
  rows: readonly PrintRow[];
  /** Single centred italic row of an empty table (« Aucune réservation. »). */
  empty: ReactNode;
  /** `grid`: every cell framed, header on a tinted background, group headers (document A). */
  variant?: "plain" | "grid" | undefined;
  groups?: readonly PrintColumnGroup[] | undefined;
}

function isCell(value: ReactNode | PrintCell): value is PrintCell {
  return typeof value === "object" && value !== null && "content" in value;
}

/**
 * Table of a printed document (`printTable`, 07 § 2.4): header repeated on each page, rows never split, one row with
 * a message when there is nothing to list.
 */
export function PrintTable({ columns, rows, empty, variant = "plain", groups }: PrintTableProps) {
  return (
    <table className={styles["table"]} data-variant={variant}>
      <thead>
        {groups === undefined ? null : (
          <tr className={styles["groups"]}>
            {groups.map((group) => (
              <th
                key={group.key}
                colSpan={group.span}
                data-align={group.center === true ? "center" : undefined}
              >
                {group.label}
              </th>
            ))}
          </tr>
        )}
        <tr>
          {columns.map((column) => (
            <th key={column.key} scope="col" className={column.className} data-align={column.align}>
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td className={styles["empty"]} colSpan={columns.length}>
              {empty}
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={row.key}>
              {row.cells.map((value, index) => {
                const column = columns[index];
                const cell: PrintCell = isCell(value) ? value : { content: value };
                return (
                  <td
                    key={column?.key ?? index}
                    className={column?.className}
                    data-align={column?.align}
                    data-tone={cell.tone}
                  >
                    {cell.content}
                  </td>
                );
              })}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
