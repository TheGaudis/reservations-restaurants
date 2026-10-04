import { expect } from "storybook/test";

import { Page } from "@/features/page/Page";
import { createFakeAppsScript } from "@/mocks/apps-script";

import preview from "../../../.storybook/preview";

// Page of both modes (G-01 to G-04): it reads the fake script of the story. The calendars and cards of P4 (b) go
// into the slots; here, placeholders show where.

const meta = preview.meta({
  component: Page,
  args: {
    r1: { calendar: <p>Calendrier R1</p>, card: <p>Fiche du jour R1</p> },
    r2: { calendar: <p>Calendrier R2</p>, card: <p>Fiche du jour R2</p> },
  },
});

/** G-04: the first read answers; the columns show their slots. */
export const Loaded = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Fiche du jour R1")).toBeVisible();
    await expect(canvas.getByRole("main")).toHaveAttribute("aria-busy", "false");
  },
});

/** G-03: the first read fails; the skeleton stops under the load error box. */
export const LoadFailure = meta.story({
  beforeEach: ({ msw }) => {
    const script = createFakeAppsScript();
    script.failNext("error");
    msw.use(...script.handlers);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      /^Le service de réservation ne répond pas\./u,
    );
    await expect(canvas.getByRole("button", { name: "Réessayer" })).toBeVisible();
  },
});
