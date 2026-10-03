import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";
import { showToast, toastManager } from "@/ui/feedback/toast";
import { Toaster } from "@/ui/feedback/Toaster";

afterEach(() => {
  toastManager.close();
  vi.useRealTimers();
});

async function renderToaster() {
  const { screen } = await renderWithProviders(<Toaster />);
  // The viewport is in a portal, after the rendered container.
  const region = screen.getByRole("region", { name: "Notifications" });
  await expect.element(region).toBeInTheDocument();
  return { screen, region: region.element() };
}

// Toast roots on screen: a dialog, an alertdialog for an error (Base UI); a replaced toast is leaving.
function shownToasts() {
  return [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].filter(
    (element) => element instanceof HTMLElement && !Object.hasOwn(element.dataset, "endingStyle"),
  );
}

describe("Toaster", () => {
  it("shows a toast added outside React in the « Notifications » region (08 § 4.14)", async () => {
    const { screen, region } = await renderToaster();
    showToast("Réservation confirmée.");
    const toast = screen.getByRole("dialog", { name: "Réservation confirmée." });
    await expect.element(toast).toHaveAttribute("data-type", "success");
    expect(region.textContent).toBe("Réservation confirmée.");
    expect(region.getAttribute("aria-live")).toBe("polite");
  });

  it.each([
    ["success", "Réservation confirmée.", "rgb(78, 122, 18)"],
    ["neutral", "Commandes en ligne clôturées à 10h.", "rgb(78, 122, 18)"],
    ["error", "Il ne reste que 5 couvert(s) pour ce jour.", "rgb(183, 55, 47)"],
  ] as const)(
    "draws a %s toast with its state colour (04 § 9, 08 § 4.14)",
    async (kind, message, colour) => {
      await renderToaster();
      showToast(message, kind);
      await vi.waitFor(() => {
        expect(shownToasts()).toHaveLength(1);
      });
      const [toast] = shownToasts();
      expect(toast instanceof HTMLElement ? toast.dataset["type"] : null).toBe(kind);
      expect(getComputedStyle(toast ?? document.body).borderLeftColor).toBe(colour);
    },
  );

  it("announces an error at once, in an alert (a-8, R-16)", async () => {
    const { screen } = await renderToaster();
    const message = "Le serveur est très sollicité : réessayez dans quelques secondes.";
    showToast(message, "error");
    const alert = screen.getByRole("alert");
    await expect.element(alert).toBeInTheDocument();
    expect(alert.element().textContent).toBe(message);
  });

  it("keeps one toast: a new one replaces the shown one (a-8, E-02)", async () => {
    const { region } = await renderToaster();
    showToast("Réservation confirmée.");
    showToast("Réservation enregistrée.");
    await vi.waitFor(() => {
      expect(shownToasts()).toHaveLength(1);
    });
    // The replaced toast fades out, then leaves the region.
    await expect.poll(() => region.textContent).toBe("Réservation enregistrée.");
  });

  it("leaves after 3.5 s (00 § 2.1)", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { region } = await renderToaster();
    showToast("Réservation confirmée.");
    await vi.waitFor(() => {
      expect(shownToasts()).toHaveLength(1);
    });
    vi.advanceTimersByTime(3499);
    expect(shownToasts()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    await vi.waitFor(() => {
      expect(shownToasts()).toHaveLength(0);
    });
    vi.useRealTimers();
    await expect.poll(() => region.textContent).toBe("");
  });

  it("never takes a click meant for the page below (08 § 4.14)", async () => {
    const { region } = await renderToaster();
    showToast("Réservation confirmée.");
    await vi.waitFor(() => {
      expect(shownToasts()).toHaveLength(1);
    });
    expect(getComputedStyle(region).pointerEvents).toBe("none");
  });
});
