import { afterEach, describe, expect, it, vi } from "vitest";

import { Header } from "@/features/page/Header";
import { renderWithProviders } from "@/test/render";

// Header (04 § 2, 08 § 7.2) and easter egg (D-01, 09 § 7).

const TEXTS = { name1: "Restaurant Pédagogique", name2: "Aristide", desc1: "", desc2: "" };
const VIDEO = "https://youtu.be/dQw4w9WgXcQ?list=RDdQw4w9WgXcQ";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function clickLogo(times: number, every: number): Promise<void> {
  const { screen } = await renderWithProviders(<Header texts={TEXTS} />);
  const logo = screen.getByRole("img", { name: "Lycée Aristide Briand" }).element();
  for (let click = 0; click < times; click += 1) {
    if (click > 0) vi.advanceTimersByTime(every);
    logo.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }
}

describe("Header", () => {
  it("shows the school, the title and the subtitle of 04 § 2", async () => {
    const { screen } = await renderWithProviders(
      <Header
        texts={{ ...TEXTS, name1: "Le Gourmet" }}
        modeSwitch={<button type="button">Client</button>}
      />,
    );
    await expect.element(screen.getByText("Lycée professionnel Aristide Briand")).toBeVisible();
    await expect
      .element(screen.getByRole("heading", { level: 1 }))
      .toHaveTextContent("Réservations des restaurants pédagogiques et Aristide");
    await expect
      .element(
        screen.getByText("Table côté Le Gourmet · Plats à emporter ou sur place côté Aristide"),
      )
      .toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Client" })).toBeVisible();
  });

  it("opens the video in a new tab after five clicks on the logo within 2 s (D-01)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    await clickLogo(5, 400);
    expect(open).toHaveBeenCalledExactlyOnceWith(VIDEO, "_blank", "noopener");
  });

  it("does nothing when the five clicks take more than 2 s", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    await clickLogo(5, 750);
    expect(open).not.toHaveBeenCalled();
  });
});
