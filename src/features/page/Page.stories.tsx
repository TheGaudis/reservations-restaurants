import { expect } from "storybook/test";

import { Header } from "@/features/page/Header";
import { PageColumn, PageLoadError } from "@/features/page/Page";
import { Columns, Main } from "@/features/page/PageLayout";
import { createFakeAppsScript } from "@/mocks/apps-script";
import { AutoRefresh } from "@/queries/AutoRefresh";

import preview from "../../../.storybook/preview";

// Header and `<main>` of both modes (G-02 to G-04), as the root and a route compose them: `AutoRefresh` reads the fake
// script of the story. Placeholders stand in for the calendars and the cards.

/** The header, then `<main>` as `PublicPage` composes it. */
function TestPage() {
  return (
    <>
      <Header />
      <Main busy={false}>
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
      </Main>
      <AutoRefresh />
    </>
  );
}

const meta = preview.meta({ component: TestPage });

/** G-04: the first read answers; the columns show their content. */
export const Loaded = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Fiche du jour R1")).toBeVisible();
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
