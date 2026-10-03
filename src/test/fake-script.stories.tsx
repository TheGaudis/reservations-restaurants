import { expect } from "storybook/test";

import preview from "../../.storybook/preview";

// Checks of the Storybook setup itself (PLAN § 3.1, R-33): the fake script of .storybook/preview.tsx answers the
// Apps Script URL, a new instance per story, and msw refuses any other host.

const SCRIPT_URL = "https://script.google.com/macros/s/STORY/exec";

async function readState(): Promise<Record<string, unknown>> {
  const response = await fetch(SCRIPT_URL);
  return (await response.json()) as Record<string, unknown>;
}

const meta = preview.meta({
  title: "test/Faux script",
  render: () => <p>Vérifications du faux script dans Storybook.</p>,
});

export const WritesIntoItsOwnScript = meta.story({
  play: async () => {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "addBookingR1",
        date: "2026-10-05",
        nom: "Inès Roux",
        nbEleve: 2,
      }),
    });
    await expect(response.ok).toBe(true);
    const state = await readState();
    await expect(state["etag"]).not.toBe("E1");
  },
});

export const StartsFromTheSeed = meta.story({
  play: async () => {
    const state = await readState();
    await expect(state["etag"]).toBe("E1");
    await expect(state["name1"]).toBe("Restaurant Pédagogique");
  },
});

export const RefusesOtherHosts = meta.story({
  play: async () => {
    // msw answers an unhandled request with a 500 error response, before any network access.
    const response = await fetch("https://example.com/");
    await expect(response.status).toBe(500);
  },
});
