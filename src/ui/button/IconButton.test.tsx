import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { renderWithProviders } from "@/test/render";
import { IconButton } from "@/ui/button/IconButton";
import { ChevronNextIcon, PrintIcon } from "@/ui/icons";

describe("IconButton", () => {
  it("is named by its aria-label only, the icon is hidden (08 § 4.4)", async () => {
    const { screen } = await renderWithProviders(
      <IconButton aria-label="Semaine suivante">
        <ChevronNextIcon />
      </IconButton>,
    );
    const button = screen.getByRole("button", { name: "Semaine suivante" });
    await expect.element(button).toHaveAttribute("type", "button");
    expect(button.element().querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("draws a 40 px round button with a 24 px icon and a 48 px touch target (08 § 4.4)", async () => {
    const { screen } = await renderWithProviders(
      <IconButton aria-label="Semaine suivante">
        <ChevronNextIcon />
      </IconButton>,
    );
    const button = screen.getByRole("button", { name: "Semaine suivante" }).element();
    const box = button.getBoundingClientRect();
    expect([box.width, box.height]).toStrictEqual([40, 40]);
    const icon = button.querySelector("svg")?.getBoundingClientRect();
    expect([icon?.width, icon?.height]).toStrictEqual([24, 24]);
    const target = getComputedStyle(button, "::after");
    expect(target.inset).toBe("-4px");
  });

  it("draws a stroke icon at 20 px (08 § 4.4)", async () => {
    const { screen } = await renderWithProviders(
      <IconButton aria-label="Imprimer">
        <PrintIcon />
      </IconButton>,
    );
    const icon = screen
      .getByRole("button", { name: "Imprimer" })
      .element()
      .querySelector("svg")
      ?.getBoundingClientRect();
    expect([icon?.width, icon?.height]).toStrictEqual([20, 20]);
  });

  it("tints the tonal variant with the accent (08 § 4.4)", async () => {
    const { screen } = await renderWithProviders(
      <IconButton aria-label="Semaine suivante" tone="tonal">
        <ChevronNextIcon />
      </IconButton>,
      { accent: "r2" },
    );
    const button = screen.getByRole("button", { name: "Semaine suivante" });
    await expect.element(button).toHaveAttribute("data-tone", "tonal");
    // --accent-container of the magenta theme: rgba(163, 35, 127, .16).
    expect(getComputedStyle(button.element()).backgroundColor).toBe("rgba(163, 35, 127, 0.16)");
  });

  it("is reached with Tab and activated with Enter and Space", async () => {
    const onClick = vi.fn();
    const { screen } = await renderWithProviders(
      <IconButton aria-label="Afficher le mot de passe" onClick={onClick}>
        <ChevronNextIcon />
      </IconButton>,
    );
    await userEvent.tab();
    const button = screen.getByRole("button", { name: "Afficher le mot de passe" });
    await expect.element(button).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("dims a disabled button to 38 % (08 § 4.4)", async () => {
    const { screen } = await renderWithProviders(
      <IconButton aria-label="Semaine précédente" disabled>
        <ChevronNextIcon />
      </IconButton>,
    );
    const button = screen.getByRole("button", { name: "Semaine précédente" });
    await expect.element(button).toBeDisabled();
    expect(getComputedStyle(button.element()).opacity).toBe("0.38");
  });
});
