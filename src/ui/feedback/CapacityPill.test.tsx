import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render";
import { CapacityPill } from "@/ui/feedback/CapacityPill";

describe("CapacityPill", () => {
  it.each([
    { state: "available", percent: 60, counts: "12 / 20 couverts", word: "" },
    { state: "almostFull", percent: 25, counts: "5 / 20 couverts", word: "Bientôt complet" },
    { state: "full", percent: 0, counts: "0 / 20 couverts", word: "Complet" },
  ] as const)(
    "shows the $state state with its word (05 § 4.5, D-02)",
    async ({ state, percent, counts, word }) => {
      const { screen } = await renderWithProviders(
        <CapacityPill percent={percent} state={state}>
          {counts}
        </CapacityPill>,
      );
      const pill = screen.getByText(counts).element();
      expect(pill.parentElement?.textContent).toBe(`${counts}${word}`);
      expect(pill instanceof HTMLElement ? pill.dataset["state"] : null).toBe(state);
    },
  );

  it("colours the gauge with the state: green, orange, red (08 § 4.8)", async () => {
    const { screen } = await renderWithProviders(
      <>
        <CapacityPill percent={60} state="available">
          12 / 20
        </CapacityPill>
        <CapacityPill percent={25} state="almostFull">
          5 / 20
        </CapacityPill>
        <CapacityPill percent={0} state="full">
          0 / 20
        </CapacityPill>
      </>,
    );
    const colours = ["12 / 20", "5 / 20", "0 / 20"].map(
      (counts) => getComputedStyle(screen.getByText(counts).element()).color,
    );
    expect(new Set(colours).size).toBe(3);
  });

  it("fills the share still free (gaugeStyle, 00 § 3)", async () => {
    const { screen } = await renderWithProviders(
      <CapacityPill percent={40} state="almostFull">
        8 / 20 couverts
      </CapacityPill>,
    );
    const pill = screen.getByText("8 / 20 couverts").element();
    const fill = pill.firstElementChild?.getBoundingClientRect();
    const box = pill.getBoundingClientRect();
    // Inside the 1 px border.
    expect(fill?.width).toBeCloseTo((box.width - 2) * 0.4, 1);
  });

  it("says « Épuisé » for a sold-out dish (D-02)", async () => {
    const { screen } = await renderWithProviders(
      <CapacityPill percent={0} state="full" fullLabel="Épuisé">
        0 / 10
      </CapacityPill>,
    );
    await expect.element(screen.getByText("Épuisé")).toBeVisible();
    await expect.element(screen.getByText("Complet")).not.toBeInTheDocument();
  });

  it("keeps a 76 px minimum width and tabular figures (08 § 4.8)", async () => {
    const { screen } = await renderWithProviders(
      <CapacityPill percent={100} state="available">
        3 / 3
      </CapacityPill>,
    );
    const pill = screen.getByText("3 / 3").element();
    expect(pill.getBoundingClientRect().width).toBeGreaterThanOrEqual(76);
    expect(getComputedStyle(pill).fontVariantNumeric).toBe("tabular-nums");
    expect(getComputedStyle(pill).userSelect).toBe("none");
  });
});
