import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { renderWithProviders } from "@/test/render";
import { Button } from "@/ui/button/Button";
import { PrintIcon } from "@/ui/icons";

function styleOf(element: Element) {
  return getComputedStyle(element);
}

describe("Button", () => {
  it("is a type=button named by its label, activated by a click, Enter and Space", async () => {
    const onClick = vi.fn();
    const { screen } = await renderWithProviders(<Button onClick={onClick}>Modifier</Button>);
    const button = screen.getByRole("button", { name: "Modifier" });
    await expect.element(button).toHaveAttribute("type", "button");
    await userEvent.tab();
    await expect.element(button).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it.each([
    ["neutral", "default"],
    ["primary", "default"],
    ["ghost", "default"],
    ["danger", "small"],
  ] as const)(
    "exposes the %s variant and the %s size as data attributes (08 § 4.2)",
    async (variant, size) => {
      const { screen } = await renderWithProviders(
        <Button variant={variant} size={size}>
          Fermer
        </Button>,
      );
      const button = screen.getByRole("button", { name: "Fermer" });
      await expect.element(button).toHaveAttribute("data-variant", variant);
      await expect.element(button).toHaveAttribute("data-size", size);
    },
  );

  it("draws 40 px buttons, 32 px small ones, and the primary one in the accent (08 § 4.2)", async () => {
    const { screen } = await renderWithProviders(
      <>
        <Button variant="primary">Réserver</Button>
        <Button size="small">Modifier</Button>
      </>,
      { accent: "r1" },
    );
    const primary = screen.getByRole("button", { name: "Réserver" }).element();
    const small = screen.getByRole("button", { name: "Modifier" }).element();
    expect(primary.getBoundingClientRect().height).toBe(40);
    expect(small.getBoundingClientRect().height).toBe(32);
    // --ab-green-ink (#4E6614): accent of the R1 column; white text.
    expect(styleOf(primary).backgroundColor).toBe("rgb(78, 102, 20)");
    expect(styleOf(primary).color).toBe("rgb(255, 255, 255)");
    expect(styleOf(primary).userSelect).toBe("none");
  });

  it("shows the keyboard focus ring: 3 px of the accent, 2 px away (08 § 3)", async () => {
    const { screen } = await renderWithProviders(<Button>Modifier</Button>);
    await userEvent.tab();
    const button = screen.getByRole("button", { name: "Modifier" }).element();
    expect(button.matches(":focus-visible")).toBe(true);
    expect(styleOf(button).outlineWidth).toBe("3px");
    expect(styleOf(button).outlineStyle).toBe("solid");
    expect(styleOf(button).outlineOffset).toBe("2px");
  });

  it("dims a disabled button to 38 % and ignores it (08 § 4.2)", async () => {
    const onClick = vi.fn();
    const { screen } = await renderWithProviders(
      <Button disabled onClick={onClick}>
        Annuler
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Annuler" });
    await expect.element(button).toBeDisabled();
    expect(styleOf(button.element()).opacity).toBe("0.38");
    await userEvent.click(button, { force: true });
    expect(onClick).not.toHaveBeenCalled();
  });

  it("stays focused while busy, says « Envoi en cours… » and ignores clicks (08 § 4.2, E-04)", async () => {
    const onClick = vi.fn();
    const { screen } = await renderWithProviders(
      <Button variant="primary" busy onClick={onClick}>
        Valider
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Envoi en cours…" });
    await expect.element(button).toHaveAttribute("aria-busy", "true");
    await expect.element(button).toHaveAttribute("aria-disabled", "true");
    await userEvent.tab();
    await expect.element(button).toHaveFocus();
    await userEvent.click(button, { force: true });
    await userEvent.keyboard("{Enter}");
    expect(onClick).not.toHaveBeenCalled();
    expect(styleOf(button.element()).opacity).toBe("0.38");
  });

  it("takes the waiting label given by the caller (03 § 3.2)", async () => {
    const { screen } = await renderWithProviders(
      <Button variant="primary" busy busyLabel="Nouvelle tentative…">
        Réessayer
      </Button>,
    );
    await expect
      .element(screen.getByRole("button", { name: "Nouvelle tentative…" }))
      .toHaveAttribute("aria-busy", "true");
  });

  it("keeps an icon out of the name (07 § 1)", async () => {
    const { screen } = await renderWithProviders(
      <Button>
        <PrintIcon />
        Imprimer la liste
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Imprimer la liste" });
    expect(button.element().querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });
});
