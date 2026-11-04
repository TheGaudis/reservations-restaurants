import { afterEach, describe, expect, it, vi } from "vitest";
import { cdp, userEvent } from "vitest/browser";

import { renderWithProviders } from "@/test/render";
import { ConfirmButton } from "@/ui/button/ConfirmButton";
import { CapacityPill } from "@/ui/feedback/CapacityPill";
import { Skeleton } from "@/ui/feedback/Skeleton";
import { showToast, toastManager } from "@/ui/feedback/toast";
import { Toaster } from "@/ui/feedback/Toaster";
import { ViewToggle } from "@/ui/toggle/ViewToggle";

async function emulateReducedMotion(reduce: boolean) {
  await cdp().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: reduce ? "reduce" : "no-preference" }],
  });
}

afterEach(async () => {
  toastManager.close();
  await emulateReducedMotion(false);
});

function Components() {
  return (
    <>
      <ConfirmButton detail="Confirmer la suppression de ce plat" onConfirm={vi.fn()}>
        Supprimer
      </ConfirmButton>
      <ViewToggle
        aria-label="Affichage du calendrier"
        items={[
          { value: "week", label: "Semaine" },
          { value: "month", label: "Mois" },
        ]}
        value="week"
        onValueChange={vi.fn()}
      />
      <CapacityPill percent={50} state="available">
        10 / 20 couverts
      </CapacityPill>
      <Skeleton />
      <Toaster />
    </>
  );
}

// Every element of the page with its pseudo-elements: what moves, and for how long.
function motions() {
  return [...document.querySelectorAll("body *")].flatMap((element) =>
    [null, "::before", "::after"].map((pseudo) => {
      const style = getComputedStyle(element, pseudo);
      return { animation: style.animationName, transition: style.transitionDuration };
    }),
  );
}

describe("prefers-reduced-motion (08 § 5)", () => {
  it("animates the components by default", async () => {
    const { screen } = await renderWithProviders(<Components />);
    await userEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    showToast("Plat supprimé.");
    await expect.element(screen.getByRole("dialog")).toBeInTheDocument();
    const all = motions();
    expect(all.some(({ animation }) => animation !== "none")).toBe(true);
    expect(all.some(({ transition }) => transition !== "0s")).toBe(true);
  });

  it("stops every animation and transition when the user asks for less motion", async () => {
    await emulateReducedMotion(true);
    const { screen } = await renderWithProviders(<Components />);
    await userEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    showToast("Plat supprimé.");
    await expect.element(screen.getByRole("dialog")).toBeInTheDocument();
    const all = motions();
    expect(all.filter(({ animation }) => animation !== "none")).toStrictEqual([]);
    expect(all.filter(({ transition }) => transition !== "0s")).toStrictEqual([]);
  });
});
