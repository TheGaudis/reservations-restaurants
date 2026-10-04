import { expect } from "storybook/test";

import { Page, PageColumn, PageHeader, PageLoadError, PageMain } from "@/features/page/Page";
import { Columns } from "@/features/page/PageLayout";
import { createFakeAppsScript } from "@/mocks/apps-script";

import preview from "../../../.storybook/preview";

// Page of both modes (G-01 to G-04): it reads the fake script of the story. Placeholders stand in for the calendars
// and the cards.

const meta = preview.meta({
  component: Page,
  args: {
    children: (
      <>
        <PageHeader />
        <PageMain>
          <PageLoadError />
          <Columns>
            <PageColumn restaurant="r1">
              <p>Calendrier R1</p>
              <p>Fiche du jour R1</p>
            </PageColumn>
            <PageColumn restaurant="r2">
              <p>Calendrier R2</p>
              <p>Fiche du jour R2</p>
            </PageColumn>
          </Columns>
        </PageMain>
      </>
    ),
  },
});

/** G-04: the first read answers; the columns show their content. */
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
