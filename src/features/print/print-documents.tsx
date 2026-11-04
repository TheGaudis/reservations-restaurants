import { defineMessage } from "react-intl";

import { listR1, listR2 } from "@/domain/print";
import type { FullState, IsoDate, Restaurant } from "@/domain/types";
import { PrintListR1 } from "@/features/print/PrintListR1";
import { PrintListR2 } from "@/features/print/PrintListR2";
import { formatLongDate } from "@/intl/dates";
import { intl } from "@/intl/intl";
import { printDocument } from "@/ui/print/print";

// The print chunk: the four documents and ui/print/print.ts, loaded by the single import() of print-day.ts.

const listTitle = defineMessage<{ name: string; date: string }>({
  id: "print.list.title",
  defaultMessage: "{name} — {date}",
  description:
    "07 § 3, § 4 — titre du document, nom proposé pour le PDF (« Restaurant Pédagogique — vendredi 9 octobre 2026 »)",
});

const tomorrowTitle = defineMessage<{ name: string; date: string }>({
  id: "print.tomorrow.title",
  defaultMessage: "{name} — demain {date}",
  description: "07 § 6, § 7 — titre du résumé du lendemain, nom proposé pour le PDF",
});

export interface PrintRequest {
  restaurant: Restaurant;
  /** Full state at the click (PLAN § 3.8). */
  state: FullState;
  iso: IsoDate;
  /** Summary of tomorrow (documents C, D) instead of the list of the day (documents A, B). */
  tomorrow: boolean;
  /** The button that printed: it gets the focus back after printing. */
  opener: HTMLElement;
  /** Time of the click, in ms. */
  printedAt: number;
}

/** Prints document A, B, C or D, titled « {name} — {date} » or « {name} — demain {date} » (07 § 3, § 4, § 6, § 7). */
export async function printDocumentOfDay(request: PrintRequest): Promise<void> {
  const { state, iso, tomorrow, printedAt } = request;
  const r1 = request.restaurant === "r1";
  const name = r1 ? state.settings.name1 : state.settings.name2;
  const title = intl.formatMessage(tomorrow ? tomorrowTitle : listTitle, {
    name,
    date: formatLongDate(iso),
  });
  const content = r1 ? (
    <PrintListR1 list={listR1(state, iso)} tomorrow={tomorrow} printedAt={printedAt} />
  ) : (
    <PrintListR2 list={listR2(state, iso)} tomorrow={tomorrow} printedAt={printedAt} />
  );
  await printDocument(content, { title, opener: request.opener });
}
