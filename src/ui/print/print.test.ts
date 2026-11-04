import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearPrintedDocument, printDocument } from "@/ui/print/print";

import "@/styles/print.css";

// Printing in the same document (PLAN § 3.8, E-15, R-27): `window.print` is replaced by a spy that records what
// .print-root holds and the title at the moment of the call.

const PAGE_TITLE = "Réservations — Restaurants pédagogiques";

interface PrintCall {
  title: string;
  text: string;
}

let calls: PrintCall[];

function printRoot(): HTMLElement | null {
  return document.body.querySelector(":scope > .print-root");
}

beforeEach(() => {
  document.title = PAGE_TITLE;
  calls = [];
  vi.spyOn(window, "print").mockImplementation(() => {
    calls.push({ title: document.title, text: printRoot()?.textContent ?? "" });
  });
});

afterEach(() => {
  globalThis.dispatchEvent(new Event("afterprint"));
  vi.restoreAllMocks();
});

/** `document.fonts.ready` of fonts that never load. */
const FONTS_NEVER_READY = new Promise<FontFaceSet>(() => {
  // Never settles.
});

function opener(): HTMLButtonElement {
  const button = document.createElement("button");
  button.textContent = "Imprimer la liste";
  document.body.append(button);
  return button;
}

describe("printDocument", () => {
  it("renders the document before print(), with the title of the PDF (07 § 3)", async () => {
    const pending = printDocument(createElement("h1", null, "Restaurant Pédagogique"), {
      title: "Restaurant Pédagogique — mardi 6 octobre 2026",
      opener: null,
    });
    // flushSync: the document is in the page as soon as printDocument returns its promise.
    expect(printRoot()?.textContent).toBe("Restaurant Pédagogique");
    expect(printRoot()?.parentElement).toBe(document.body);
    await pending;
    expect(calls).toStrictEqual([
      {
        title: "Restaurant Pédagogique — mardi 6 octobre 2026",
        text: "Restaurant Pédagogique",
      },
    ]);
  });

  it("shows nothing of the document on screen", async () => {
    await printDocument(createElement("p", null, "Liste"), { title: "Liste", opener: null });
    const root = printRoot();
    expect(root === null ? "" : getComputedStyle(root).display).toBe("none");
  });

  it("after afterprint: previous title, empty .print-root, focus back on the button (PLAN P6)", async () => {
    const button = opener();
    await printDocument(createElement("p", null, "Liste"), { title: "Liste", opener: button });
    expect(document.title).toBe("Liste");
    globalThis.dispatchEvent(new Event("afterprint"));
    expect(document.title).toBe(PAGE_TITLE);
    expect(printRoot()?.childElementCount).toBe(0);
    expect(document.activeElement).toBe(button);
    button.remove();
  });

  it("waits 2 s at most for the fonts (07 § 8, R-27)", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.spyOn(document.fonts, "ready", "get").mockReturnValue(FONTS_NEVER_READY);
    const pending = printDocument(createElement("p", null, "Liste"), {
      title: "Liste",
      opener: null,
    });
    await vi.advanceTimersByTimeAsync(1999);
    expect(calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(calls).toHaveLength(1);
    vi.useRealTimers();
  });

  it("replaces a document not printed yet, and keeps the title of the page", async () => {
    vi.spyOn(document.fonts, "ready", "get").mockReturnValueOnce(FONTS_NEVER_READY);
    void printDocument(createElement("p", null, "Première"), { title: "Première", opener: null });
    await printDocument(createElement("p", null, "Seconde"), { title: "Seconde", opener: null });
    expect(calls).toStrictEqual([{ title: "Seconde", text: "Seconde" }]);
    globalThis.dispatchEvent(new Event("afterprint"));
    expect(document.title).toBe(PAGE_TITLE);
    expect(printRoot()?.childElementCount).toBe(0);
  });

  it("clearPrintedDocument: empty .print-root and title of the page without afterprint (invariant 1)", async () => {
    await printDocument(createElement("p", null, "Cyrille Ungerer"), {
      title: "Liste",
      opener: null,
    });
    clearPrintedDocument();
    expect(printRoot()?.childElementCount).toBe(0);
    expect(document.body.textContent).not.toContain("Cyrille Ungerer");
    expect(document.title).toBe(PAGE_TITLE);
    // A later afterprint changes nothing.
    globalThis.dispatchEvent(new Event("afterprint"));
    expect(document.title).toBe(PAGE_TITLE);
  });

  it("clearPrintedDocument cancels a print still waiting for the fonts", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.spyOn(document.fonts, "ready", "get").mockReturnValue(FONTS_NEVER_READY);
    const pending = printDocument(createElement("p", null, "Liste"), {
      title: "Liste",
      opener: null,
    });
    clearPrintedDocument();
    await vi.advanceTimersByTimeAsync(2000);
    await pending;
    expect(calls).toHaveLength(0);
    expect(printRoot()?.childElementCount).toBe(0);
    vi.useRealTimers();
  });
});
