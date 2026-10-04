// Print actions of the staff mode (07 § 1, PLAN § 3.8). Each one reads its data from the full state at the click,
// then loads the document and the print module by import(): neither enters the initial path nor the /collegue
// chunk (S3).
import { createElement } from "react";
import type { ComponentType } from "react";
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

/**
 * Loads the document and the print module, then prints `list`; `opener` gets the focus back after printing. Never
 * rejects: a chunk that fails to load (site updated meanwhile, network down) leaves the page as it was, with the error
 * in the console; no text of the spec covers that case.
 */
async function printWith<L>(
  loadDocument: () => Promise<ComponentType<{ list: L; printedAt: number }>>,
  list: L,
  title: string,
  opener: HTMLElement,
): Promise<void> {
  const printedAt = Date.now();
  try {
    const [{ printDocument }, Document] = await Promise.all([
      import("@/ui/print/print"),
      loadDocument(),
    ]);
    await printDocument(createElement(Document, { list, printedAt }), { title, opener });
  } catch (error) {
    console.error(error);
  }
}

// One chunk per document (S3): each `import()` stays literal.
async function loadListR1() {
  const module = await import("@/features/print/ListDocumentR1");
  return module.ListDocumentR1;
}

async function loadListR2() {
  const module = await import("@/features/print/ListDocumentR2");
  return module.ListDocumentR2;
}

async function loadTomorrowR1() {
  const module = await import("@/features/print/TomorrowDocumentR1");
  return module.TomorrowDocumentR1;
}

async function loadTomorrowR2() {
  const module = await import("@/features/print/TomorrowDocumentR2");
  return module.TomorrowDocumentR2;
}

/** Document A, list of the R1 day `iso` (07 § 3). */
export async function printListR1(state: FullState, iso: IsoDate, opener: HTMLElement) {
  const list = listR1(state, iso);
  await printWith(loadListR1, list, listTitle(list.restaurantName, iso), opener);
}

/** Document B, list of the R2 day `iso` (07 § 4). */
export async function printListR2(state: FullState, iso: IsoDate, opener: HTMLElement) {
  const list = listR2(state, iso);
  await printWith(loadListR2, list, listTitle(list.restaurantName, iso), opener);
}

/** Document C, R1 summary of `tomorrow` (07 § 6), for the « Imprimer » button of the R1 block of « Demain ». */
export async function printTomorrowR1(state: FullState, tomorrow: IsoDate, opener: HTMLElement) {
  const list = listR1(state, tomorrow);
  await printWith(loadTomorrowR1, list, tomorrowTitle(list.restaurantName, tomorrow), opener);
}

/** Document D, R2 summary of `tomorrow` (07 § 7), for the « Imprimer » button of the R2 block of « Demain ». */
export async function printTomorrowR2(state: FullState, tomorrow: IsoDate, opener: HTMLElement) {
  const list = listR2(state, tomorrow);
  await printWith(loadTomorrowR2, list, tomorrowTitle(list.restaurantName, tomorrow), opener);
}
