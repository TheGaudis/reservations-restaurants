import { createElement } from "react";
import type { ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";

import { PrintRoot } from "@/ui/print/PrintRoot";

// Printing in the same document (PLAN § 3.8, E-15, R-27). Loaded by import() at the click on a print button. The
// document goes into `.print-root`, a child of <body> that styles/print.css hides on screen and shows alone in
// print. `afterprint` ends the printing: previous title, empty `.print-root`, focus back on the button.

/** Longest wait for the fonts before `print()` (07 § 8: 2 000 ms). */
const FONTS_TIMEOUT_MS = 2000;

interface PrintOptions {
  /** `document.title` while printing: the name offered for the PDF (07 § 3, § 4, § 6, § 7). */
  title: string;
  /** The button that printed: it gets the focus back after `afterprint`. */
  opener: HTMLElement | null;
}

interface Printing {
  root: Root;
  previousTitle: string;
  opener: HTMLElement | null;
  stopListening: AbortController;
}

let printing: Printing | null = null;

/** The `.print-root` element, created once at the end of <body>. */
function printRootElement(): HTMLElement {
  const existing = document.body.querySelector(":scope > .print-root");
  if (existing instanceof HTMLElement) return existing;
  const element = document.createElement("div");
  element.className = "print-root";
  document.body.append(element);
  return element;
}

/** Removes the document of `current` from the page. */
function unmount(current: Printing): void {
  current.stopListening.abort();
  current.root.unmount();
}

/** Ends the printing in progress, if any: document removed, title of the page back. Returns what it ended. */
function stopPrinting(): Printing | null {
  const current = printing;
  if (current === null) return null;
  printing = null;
  unmount(current);
  document.title = current.previousTitle;
  return current;
}

function endPrinting(): void {
  const current = stopPrinting();
  if (current?.opener?.isConnected === true) current.opener.focus();
}

/**
 * Removes the printed document from the page without waiting for `afterprint`, which some browsers never send:
 * called when the staff session closes, its names must leave the page (invariant 1, PLAN § 3.3.4). A print still
 * waiting for the fonts is cancelled.
 */
export function clearPrintedDocument(): void {
  stopPrinting();
  document.body.querySelector(":scope > .print-root")?.replaceChildren();
}

/** Resolves once the fonts are loaded, or after 2 s (07 § 8). */
async function fontsReady(): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, FONTS_TIMEOUT_MS);
  });
  await Promise.race([document.fonts.ready, timeout]);
  clearTimeout(timer);
}

/**
 * Prints `content` in this document: renders it synchronously into `.print-root` (`flushSync`), sets the title, waits
 * for the fonts (2 s at most), then calls `window.print()`. A second call before `afterprint` replaces the document
 * and keeps the title of the page.
 */
export async function printDocument(content: ReactNode, options: PrintOptions): Promise<void> {
  const previousTitle = printing?.previousTitle ?? document.title;
  if (printing !== null) unmount(printing);
  const root = createRoot(printRootElement());
  const stopListening = new AbortController();
  const current: Printing = { root, previousTitle, opener: options.opener, stopListening };
  printing = current;
  flushSync(() => {
    root.render(createElement(PrintRoot, null, content));
  });
  document.title = options.title;
  window.addEventListener("afterprint", endPrinting, { once: true, signal: stopListening.signal });
  await fontsReady();
  // Replaced by another document, or printing already over, while the fonts loaded.
  if (printing !== current) return;
  window.print();
}
