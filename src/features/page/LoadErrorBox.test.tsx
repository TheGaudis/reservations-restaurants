import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { LoadErrorBox } from "@/features/page/LoadErrorBox";
import { renderWithProviders } from "@/test/render";

// Texts of 03 § 3.1 as read (the <br> becomes a line break), « Réessayer » of 03 § 3.2, a-21 / E-42.
const ONLINE =
  "Le service de réservation ne répond pas.\nRéessayez dans un instant. Si le problème continue, prévenez l'établissement.";
const OFFLINE = "Vous semblez hors ligne.\nVérifiez votre connexion internet, puis réessayez.";
const FROM_CACHE =
  "\nLe calendrier affiché date de votre dernière visite : les places restantes ont pu changer depuis.";

/** Text of the alert with a line break for each <br>, as a screen shows it. */
function alertText(alert: Element): string {
  return [...alert.childNodes]
    .map((node) => (node.nodeName === "BR" ? "\n" : (node.textContent ?? "")))
    .join("");
}

function setOnline(online: boolean): void {
  Object.defineProperty(navigator, "onLine", { configurable: true, get: () => online });
  window.dispatchEvent(new Event(online ? "online" : "offline"));
}

afterEach(() => {
  // Back to the getter of Navigator.prototype.
  Reflect.deleteProperty(navigator, "onLine");
});

const noRetry = async () => {
  // Nothing to read in these tests.
};

/** The box under a parent that renders again on demand. */
function Rerendered() {
  const [renders, setRenders] = useState(0);
  return (
    <>
      <LoadErrorBox fromCache={false} onRetry={noRetry} />
      <button type="button" onClick={() => setRenders(renders + 1)}>
        Rendre de nouveau
      </button>
      <p>Rendus : {renders}</p>
    </>
  );
}

describe("LoadErrorBox (G-03, 03 § 3.1)", () => {
  it("says that the service does not answer, title in bold, when online", async () => {
    const { screen } = await renderWithProviders(
      <LoadErrorBox fromCache={false} onRetry={noRetry} />,
    );
    const alert = screen.getByRole("alert");
    expect(alertText(alert.element())).toBe(ONLINE);
    expect(alert.element().querySelector("b")?.textContent).toBe(
      "Le service de réservation ne répond pas.",
    );
  });

  it("says that the device seems offline, and follows the connection", async () => {
    setOnline(false);
    const { screen } = await renderWithProviders(
      <LoadErrorBox fromCache={false} onRetry={noRetry} />,
    );
    const alert = screen.getByRole("alert");
    expect(alertText(alert.element())).toBe(OFFLINE);
    setOnline(true);
    await expect.poll(() => alertText(alert.element())).toBe(ONLINE);
  });

  it("adds the suffix of the local copy", async () => {
    const { screen } = await renderWithProviders(<LoadErrorBox fromCache onRetry={noRetry} />);
    expect(alertText(screen.getByRole("alert").element())).toBe(`${ONLINE}${FROM_CACHE}`);
  });

  it("keeps « Réessayer » busy until the read settles, the box staying (03 § 3.2)", async () => {
    let settle = () => {
      // Replaced by the promise below.
    };
    const read = new Promise<void>((resolve) => {
      settle = resolve;
    });
    const { screen } = await renderWithProviders(
      <LoadErrorBox fromCache={false} onRetry={async () => read} />,
    );
    await screen.getByRole("button", { name: "Réessayer" }).click();
    const busy = screen.getByRole("button", { name: "Nouvelle tentative…" });
    await expect.element(busy).toHaveAttribute("aria-busy", "true");
    await expect.element(busy).toBeDisabled();
    await expect.element(screen.getByRole("alert")).toBeVisible();
    settle();
    await expect.element(screen.getByRole("button", { name: "Réessayer" })).toBeEnabled();
  });

  it("writes the alert again only when its text changes (a-21, E-42)", async () => {
    const { screen } = await renderWithProviders(<Rerendered />);
    const alert = screen.getByRole("alert").element();
    const changes: MutationRecord[] = [];
    const observer = new MutationObserver((records) => changes.push(...records));
    observer.observe(alert, { childList: true, subtree: true, characterData: true });
    // Each failed refresh renders the box again, with the same text.
    await screen.getByRole("button", { name: "Rendre de nouveau" }).click();
    await expect.element(screen.getByText("Rendus : 1")).toBeVisible();
    expect(changes).toStrictEqual([]);
    setOnline(false);
    await expect.poll(() => changes.length).toBeGreaterThan(0);
    observer.disconnect();
  });
});
