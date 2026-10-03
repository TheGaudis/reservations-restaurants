import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render";
import { Skeleton } from "@/ui/feedback/Skeleton";

describe("Skeleton", () => {
  it("is hidden from assistive technologies (03 § 3)", async () => {
    const { screen } = await renderWithProviders(<Skeleton />);
    expect(screen.container.querySelector("span")?.getAttribute("aria-hidden")).toBe("true");
  });

  it.each([
    ["line", 14],
    ["title", 32],
    ["circle", 40],
    ["card", 120],
  ] as const)("draws a %s %i px high (08 § 4.16)", async (shape, height) => {
    const { screen } = await renderWithProviders(<Skeleton shape={shape} />);
    const element = screen.container.querySelector("span[aria-hidden]");
    expect(element?.getBoundingClientRect().height).toBe(height);
  });

  it("takes a share of its container and stops shimmering on a load failure (08 § 4.16)", async () => {
    const { screen } = await renderWithProviders(
      <div style={{ width: 200 }}>
        <Skeleton width="40%" still />
      </div>,
    );
    const element = screen.container.querySelector("span[aria-hidden]") ?? document.body;
    expect(element.getBoundingClientRect().width).toBe(80);
    expect(getComputedStyle(element).animationName).toBe("none");
  });
});
