import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render";
import { Spinner } from "@/ui/feedback/Spinner";

describe("Spinner", () => {
  it("is an indeterminate progress bar named « Chargement en cours » (08 § 4.15)", async () => {
    const { screen } = await renderWithProviders(<Spinner />);
    const progress = screen.getByRole("progressbar", { name: "Chargement en cours" });
    await expect.element(progress).toBeInTheDocument();
    await expect.element(progress).not.toHaveAttribute("value");
  });

  it("draws a 48 px circle hidden from assistive technologies (08 § 4.15)", async () => {
    const { screen } = await renderWithProviders(<Spinner />);
    const circle = screen.container.querySelector("svg");
    expect(circle?.getAttribute("aria-hidden")).toBe("true");
    const box = circle?.getBoundingClientRect();
    expect([box?.width, box?.height]).toStrictEqual([48, 48]);
  });
});
