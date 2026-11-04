import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { renderWithProviders } from "@/test/render";
import { ConfirmButton } from "@/ui/button/ConfirmButton";

const DETAIL = "Confirmer la suppression du jour et de toutes ses réservations";

// Only setTimeout and clearTimeout are faked: the browser commands of userEvent and the polling of expect.element
// keep their real timers.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});
afterEach(() => {
  vi.useRealTimers();
});

async function renderDeleteDay(onConfirm = vi.fn()) {
  const { screen } = await renderWithProviders(
    <ConfirmButton detail={DETAIL} onConfirm={onConfirm} size="small">
      Supprimer ce jour
    </ConfirmButton>,
  );
  return { screen, onConfirm, button: screen.getByRole("button") };
}

describe("ConfirmButton", () => {
  it("arms on the first click: « Confirmer ? », detail in aria-label and title, nothing sent (06 § 5.2)", async () => {
    const { screen, onConfirm, button } = await renderDeleteDay();
    await expect.element(button).toHaveAccessibleName("Supprimer ce jour");
    await expect.element(button).not.toHaveAttribute("title");
    await userEvent.click(button);
    await expect.element(button).toHaveTextContent("Confirmer ?");
    await expect.element(button).toHaveAccessibleName(DETAIL);
    await expect.element(button).toHaveAttribute("title", DETAIL);
    await expect.element(button).toHaveAttribute("data-armed");
    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent("Cliquez de nouveau pour confirmer.");
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("freezes its width while armed (06 § 5.2)", async () => {
    const { button } = await renderDeleteDay();
    const restWidth = button.element().getBoundingClientRect().width;
    await userEvent.click(button);
    await expect.element(button).toHaveTextContent("Confirmer ?");
    expect(button.element().getBoundingClientRect().width).toBeCloseTo(restWidth, 2);
    expect(Number(button.element().style.minWidth.replace(/px$/u, ""))).toBeCloseTo(restWidth, 2);
  });

  it("confirms on a second click within 4 s, with the keyboard too (06 § 5.2)", async () => {
    const { onConfirm, button } = await renderDeleteDay();
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    await expect.element(button).toHaveTextContent("Confirmer ?");
    vi.advanceTimersByTime(3999);
    await userEvent.keyboard(" ");
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("goes back to rest after 4 s without a second click (06 § 5.2)", async () => {
    const { screen, onConfirm, button } = await renderDeleteDay();
    await userEvent.click(button);
    vi.advanceTimersByTime(3999);
    await expect.element(button).toHaveTextContent("Confirmer ?");
    vi.advanceTimersByTime(1);
    await expect.element(button).toHaveTextContent("Supprimer ce jour");
    await expect.element(button).toHaveAccessibleName("Supprimer ce jour");
    await expect.element(button).not.toHaveAttribute("title");
    await expect.element(button).not.toHaveAttribute("data-armed");
    expect(button.element().style.minWidth).toBe("");
    await expect.element(screen.getByRole("status")).toHaveTextContent("");
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("gives a fast new arming its full 4 s: each click cancels the previous timer (a-19)", async () => {
    const { onConfirm, button } = await renderDeleteDay();
    await userEvent.click(button);
    vi.advanceTimersByTime(1000);
    await userEvent.click(button);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await expect.element(button).toHaveTextContent("Supprimer ce jour");
    vi.advanceTimersByTime(1000);
    await userEvent.click(button);
    await expect.element(button).toHaveTextContent("Confirmer ?");
    // The first timer would have fired at 4 s.
    vi.advanceTimersByTime(2500);
    await expect.element(button).toHaveTextContent("Confirmer ?");
    vi.advanceTimersByTime(1500);
    await expect.element(button).toHaveTextContent("Supprimer ce jour");
  });

  it("clears its timer when it leaves the page", async () => {
    function Removable() {
      const [shown, setShown] = useState(true);
      return shown ? (
        <ConfirmButton
          detail={DETAIL}
          onConfirm={() => {
            setShown(false);
          }}
        >
          Supprimer ce jour
        </ConfirmButton>
      ) : null;
    }
    const { screen } = await renderWithProviders(<Removable />);
    await userEvent.click(screen.getByRole("button"));
    expect(vi.getTimerCount()).toBe(1);
    await userEvent.click(screen.getByRole("button"));
    await expect.element(screen.getByRole("button")).not.toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stays « Confirmer ? » and busy while the deletion is sent, then comes back to rest (E-04)", async () => {
    function DeleteDay() {
      const [busy, setBusy] = useState(false);
      return (
        <>
          <ConfirmButton
            detail={DETAIL}
            busy={busy}
            onConfirm={() => {
              setBusy(true);
            }}
          >
            Supprimer ce jour
          </ConfirmButton>
          <button
            type="button"
            onClick={() => {
              setBusy(false);
            }}
          >
            Réponse
          </button>
        </>
      );
    }
    const { screen } = await renderWithProviders(<DeleteDay />);
    const button = screen.getByRole("button", { name: "Supprimer ce jour" });
    await userEvent.click(button);
    await userEvent.click(screen.getByRole("button", { name: DETAIL }));
    const busy = screen.getByRole("button", { name: DETAIL });
    await expect.element(busy).toHaveTextContent("Confirmer ?");
    await expect.element(busy).toHaveAttribute("aria-busy", "true");
    await expect.element(busy).toHaveAttribute("aria-disabled", "true");
    await expect.element(busy).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Réponse" }));
    await expect.element(button).toHaveTextContent("Supprimer ce jour");
    await expect.element(button).not.toHaveAttribute("aria-busy");
  });

  it("shows the detail next to the armed button when asked (D-21)", async () => {
    const detail =
      "Confirmer la suppression du jour et de ses 3 réservations (les personnes ne seront pas prévenues)";
    const { screen } = await renderWithProviders(
      <ConfirmButton detail={detail} onConfirm={vi.fn()} showDetail>
        Supprimer ce jour
      </ConfirmButton>,
    );
    await expect.element(screen.getByText(detail)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button"));
    await expect.element(screen.getByText(detail)).toBeVisible();
    await expect.element(screen.getByRole("button")).toHaveAccessibleName(detail);
  });
});
