// Print actions of the staff mode (07 § 1, PLAN § 3.8). Each one reads its data from the full state at the click,
// then loads the document and the print module by import(): neither enters the initial path nor the /collegue
// chunk (S3).
import { createElement } from "react";
import { defineMessages } from "react-intl";

import { listR1, listR2 } from "@/domain/print";
import type { FullState, IsoDate } from "@/domain/types";
import { formatLongDate } from "@/intl/dates";
import { intl } from "@/intl/intl";

// Value types of each message: react-intl types `formatMessage` from them.
const messages = defineMessages<{
  listTitle: { name: string; date: string };
  tomorrowTitle: { name: string; date: string };
}>({
  listTitle: {
    id: "print.list.title",
    defaultMessage: "{name} — {date}",
    description:
      "07 § 3, § 4 — titre du document, nom proposé pour le PDF (« Restaurant Pédagogique — vendredi 9 octobre 2026 »)",
  },
  tomorrowTitle: {
    id: "print.tomorrow.title",
    defaultMessage: "{name} — demain {date}",
    description: "07 § 6, § 7 — titre du résumé du lendemain, nom proposé pour le PDF",
  },
});

/** « {name} — {date} » (07 § 3, § 4): the document title, offered as the name of the PDF. */
function listTitle(name: string, iso: IsoDate): string {
  return intl.formatMessage(messages.listTitle, { name, date: formatLongDate(iso) });
}

/** « {name} — demain {date} » (07 § 6, § 7). */
function tomorrowTitle(name: string, iso: IsoDate): string {
  return intl.formatMessage(messages.tomorrowTitle, { name, date: formatLongDate(iso) });
}

/** Document A, list of the R1 day `iso` (07 § 3); `opener` gets the focus back after printing. */
export async function printListR1(
  state: FullState,
  iso: IsoDate,
  opener: HTMLElement,
): Promise<void> {
  const list = listR1(state, iso);
  const printedAt = Date.now();
  const [{ printDocument }, { ListDocumentR1 }] = await Promise.all([
    import("@/ui/print/print"),
    import("@/features/print/ListDocumentR1"),
  ]);
  await printDocument(createElement(ListDocumentR1, { list, printedAt }), {
    title: listTitle(list.restaurantName, iso),
    opener,
  });
}

/** Document B, list of the R2 day `iso` (07 § 4); `opener` gets the focus back after printing. */
export async function printListR2(
  state: FullState,
  iso: IsoDate,
  opener: HTMLElement,
): Promise<void> {
  const list = listR2(state, iso);
  const printedAt = Date.now();
  const [{ printDocument }, { ListDocumentR2 }] = await Promise.all([
    import("@/ui/print/print"),
    import("@/features/print/ListDocumentR2"),
  ]);
  await printDocument(createElement(ListDocumentR2, { list, printedAt }), {
    title: listTitle(list.restaurantName, iso),
    opener,
  });
}

/** Document C, R1 summary of `tomorrow` (07 § 6), for the « Imprimer » button of the R1 block of « Demain ». */
export async function printTomorrowR1(
  state: FullState,
  tomorrow: IsoDate,
  opener: HTMLElement,
): Promise<void> {
  const list = listR1(state, tomorrow);
  const printedAt = Date.now();
  const [{ printDocument }, { TomorrowDocumentR1 }] = await Promise.all([
    import("@/ui/print/print"),
    import("@/features/print/TomorrowDocumentR1"),
  ]);
  await printDocument(createElement(TomorrowDocumentR1, { list, printedAt }), {
    title: tomorrowTitle(list.restaurantName, tomorrow),
    opener,
  });
}

/** Document D, R2 summary of `tomorrow` (07 § 7), for the « Imprimer » button of the R2 block of « Demain ». */
export async function printTomorrowR2(
  state: FullState,
  tomorrow: IsoDate,
  opener: HTMLElement,
): Promise<void> {
  const list = listR2(state, tomorrow);
  const printedAt = Date.now();
  const [{ printDocument }, { TomorrowDocumentR2 }] = await Promise.all([
    import("@/ui/print/print"),
    import("@/features/print/TomorrowDocumentR2"),
  ]);
  await printDocument(createElement(TomorrowDocumentR2, { list, printedAt }), {
    title: tomorrowTitle(list.restaurantName, tomorrow),
    opener,
  });
}

/** Signature of the four print actions above. */
type PrintAction = (state: FullState, iso: IsoDate, opener: HTMLElement) => Promise<void>;

/**
 * Runs `print` from a click handler; never rejects. A chunk that fails to load (site updated meanwhile, network down) leaves the page
 * as it was, with the error in the console: no text of the spec covers that case.
 */
export async function startPrinting(
  print: PrintAction,
  state: FullState,
  iso: IsoDate,
  opener: HTMLElement,
): Promise<void> {
  try {
    await print(state, iso, opener);
  } catch (error) {
    console.error(error);
  }
}
