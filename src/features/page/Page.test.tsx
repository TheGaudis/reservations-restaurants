import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { Header } from "@/features/page/Header";
import { PageColumn, PageLoadError } from "@/features/page/Page";
import { Columns, Main } from "@/features/page/PageLayout";
import { PageSkeleton } from "@/features/page/PageSkeleton";
import { AutoRefresh } from "@/queries/AutoRefresh";
import { createQueryClient } from "@/queries/client";
import { publicStateOptions } from "@/queries/state";
import { APP_START } from "@/queries/use-app-state";
import { fakeScript } from "@/test/browser-fake-script";
import { publicState, SETTINGS } from "@/test/domain-states";
import { renderWithProviders } from "@/test/render";

// Header and `<main>` of both modes (04 § 2, 03 § 3, 08 § 7), on a real QueryClient and the fake script.

const FROM_CACHE = /Le calendrier affiché date de votre dernière visite/u;

afterEach(() => {
  localStorage.clear();
});

// `{ error }` ends a read at once; a Google error page would let the hedged read at 6 s answer (02 § 1.5).

/** A client whose public reads are not retried: a failure shows at once. */
function clientWithoutRetry() {
  const queryClient = createQueryClient();
  queryClient.setQueryDefaults(publicStateOptions.queryKey, { retry: false });
  return queryClient;
}

function alertText(container: HTMLElement): string {
  return container.querySelector('[role="alert"]')?.textContent ?? "";
}

interface TestPageProps {
  r1?: ReactNode;
  r2?: ReactNode;
}

/** The header of the root, then `<main>` as `StaffPage` composes it, placeholders in the columns; `AutoRefresh` reads. */
function TestPage({ r1, r2 }: TestPageProps) {
  return (
    <>
      <Header />
      <Main busy={false}>
        <PageLoadError />
        <Columns>
          <PageColumn restaurant="r1">{r1}</PageColumn>
          <PageColumn restaurant="r2">{r2}</PageColumn>
        </Columns>
      </Main>
      <AutoRefresh />
    </>
  );
}

function titles(container: HTMLElement): string[] {
  return [...container.querySelectorAll("h2")].map((title) => title.textContent);
}

describe("skeleton before any data (G-01, 03 § 3)", () => {
  it("shows the default titles and the skeleton, without any text about loading", async () => {
    const { screen } = await renderWithProviders(
      <>
        <Header />
        <PageSkeleton />
      </>,
    );
    await expect.element(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
    expect(titles(screen.container)).toStrictEqual(["Restaurant Pédagogique", "Aristide"]);
    await expect
      .element(screen.getByRole("heading", { level: 1 }))
      .toHaveTextContent("Réservations des restaurants pédagogiques et Aristide");
    expect(screen.container.textContent).not.toMatch(/Chargement/u);
    expect(screen.container.querySelector('[role="alert"]')).toBeNull();
  });

  it("shows the titles of the last visit (reservations-textes, 03 § 1.2)", async () => {
    localStorage.setItem(
      "reservations-textes",
      JSON.stringify({ name1: "Resto Test", name2: "", desc1: "Description mémorisée" }),
    );
    const { screen } = await renderWithProviders(
      <>
        <Header />
        <PageSkeleton />
      </>,
    );
    // An empty value keeps the default (04 § 2).
    expect(titles(screen.container)).toStrictEqual(["Resto Test", "Aristide"]);
    await expect.element(screen.getByText("Description mémorisée")).toBeVisible();
    await expect
      .element(
        screen.getByText("Table côté Resto Test · Plats à emporter ou sur place côté Aristide"),
      )
      .toBeVisible();
  });
});

describe("page with data (G-02, G-04, D-24)", () => {
  it("shows the names and descriptions of the state, the title derived from name2", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(
      publicStateOptions.queryKey,
      publicState({ settings: { ...SETTINGS, name1: "Le Gourmet", name2: "Bistrot", desc2: "" } }),
    );
    const { screen } = await renderWithProviders(<TestPage />, { queryClient });
    expect(titles(screen.container)).toStrictEqual(["Le Gourmet", "Bistrot"]);
    await expect
      .element(screen.getByRole("heading", { level: 1 }))
      .toHaveTextContent("Réservations des restaurants pédagogiques et Bistrot");
    await expect
      .element(
        screen.getByText("Table côté Le Gourmet · Plats à emporter ou sur place côté Bistrot"),
      )
      .toBeVisible();
    // Empty description: the default stays (04 § 2).
    await expect
      .element(screen.getByText("Plats à emporter ou sur place, chacun avec son propre stock."))
      .toBeVisible();
  });

  it("puts the content of each column after its title and description (05 § 1)", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(publicStateOptions.queryKey, publicState());
    const { screen } = await renderWithProviders(
      <TestPage
        r1={<p>Calendrier R1</p>}
        r2={
          <>
            <p>Ouvrir R2</p>
            <p>Calendrier R2</p>
          </>
        }
      />,
      { queryClient },
    );
    const [r1, r2] = screen.container.querySelectorAll("section");
    expect(r1?.textContent).toMatch(/Calendrier R1$/u);
    expect(r2?.textContent).toMatch(/Ouvrir R2Calendrier R2$/u);
    expect(r1?.dataset["accent"]).toBe("r1");
    expect(r2?.dataset["accent"]).toBe("r2");
  });
});

describe("page after a failed read, with the local copy (G-02, G-03, 03 § 3, § 5.2)", () => {
  it("keeps the local copy on screen and says so (G-02, 03 § 3.1)", async () => {
    const queryClient = clientWithoutRetry();
    queryClient.setQueryData(publicStateOptions.queryKey, publicState(), {
      updatedAt: APP_START - 60_000,
    });
    void queryClient.invalidateQueries({
      queryKey: publicStateOptions.queryKey,
      refetchType: "none",
    });
    fakeScript().failNext("error");
    const { screen } = await renderWithProviders(<TestPage r1={<p>Fiche R1</p>} />, {
      queryClient,
    });
    await expect.poll(() => alertText(screen.container)).toMatch(FROM_CACHE);
    await expect.element(screen.getByText("Fiche R1")).toBeVisible();
  });

  it("stays silent when a read fails after a first success (03 § 5.2)", async () => {
    const queryClient = clientWithoutRetry();
    queryClient.setQueryData(publicStateOptions.queryKey, publicState());
    const { screen } = await renderWithProviders(<TestPage />, { queryClient });
    fakeScript().failNext("error");
    await queryClient.refetchQueries({ queryKey: publicStateOptions.queryKey });
    expect(queryClient.getQueryState(publicStateOptions.queryKey)?.status).toBe("error");
    expect(screen.container.querySelector('[role="alert"]')).toBeNull();
  });
});
