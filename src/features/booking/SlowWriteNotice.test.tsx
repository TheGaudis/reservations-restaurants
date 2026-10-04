import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SlowWriteNotice } from "@/features/booking/SlowWriteNotice";
import { useSlowWrite } from "@/features/booking/use-slow-write";
import { renderWithProviders } from "@/test/render";

// Slow-write signal (D-15, E-10): 20 s after the send, until the answer; the write is never interrupted.

const SLOW =
  "Le service met du temps à répondre. Gardez cette page ouverte : la confirmation s'affichera ici.";

function Sending() {
  const slowWrite = useSlowWrite();
  return (
    <>
      <button type="button" onClick={slowWrite.start}>
        Envoyer
      </button>
      <button type="button" onClick={slowWrite.stop}>
        Réponse
      </button>
      <SlowWriteNotice slow={slowWrite.slow} timerRef={slowWrite.clearOnUnmount} />
    </>
  );
}

/** Clicks synchronously: the page timers are fake. */
function press(name: string) {
  act(() => {
    [...document.querySelectorAll("button")].find((b) => b.textContent === name)?.click();
  });
}

function shown() {
  return document.querySelector("output")?.textContent ?? "";
}

afterEach(() => {
  vi.useRealTimers();
});

describe("useSlowWrite and SlowWriteNotice (D-15)", () => {
  it("says nothing before 20 s, then the text of D-15 until the answer", async () => {
    await renderWithProviders(<Sending />);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    press("Envoyer");
    act(() => {
      vi.advanceTimersByTime(19_999);
    });
    expect(shown()).toBe("");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(shown()).toBe(SLOW);
    press("Réponse");
    expect(shown()).toBe("");
  });

  it("stops the timer when the form leaves the page", async () => {
    const { screen } = await renderWithProviders(<Sending />);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    press("Envoyer");
    expect(vi.getTimerCount()).toBe(1);
    await screen.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
