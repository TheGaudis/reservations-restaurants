import type { ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot, hydrateRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import {
  Page,
  PageColumn,
  PageHeader,
  PageLoadError,
  PageMain,
  WhenLoaded,
} from "@/features/page/Page";
import { Columns } from "@/features/page/PageLayout";
import { PageSkeleton } from "@/features/page/PageSkeleton";
import { createQueryClient } from "@/queries/client";
import { publicStateOptions } from "@/queries/state";
import { APP_START } from "@/queries/use-app-state";
import { fakeScript } from "@/test/browser-fake-script";
import { publicState, SETTINGS } from "@/test/domain-states";
import { TestProviders } from "@/test/providers";
import { renderWithProviders } from "@/test/render";

// Page of both modes (04 § 2, 03 § 3, 08 § 7), on a real QueryClient and the fake script.

const ONLINE_TITLE = /^Le service de réservation ne répond pas\./u;
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
  panels?: ReactNode;
  r1?: ReactNode;
  r2?: ReactNode;
}

/** The page composed as `StaffPage` composes it, placeholders in place of the panels and the columns' content. */
function TestPage({ panels, r1, r2 }: TestPageProps) {
  return (
    <Page>
      <PageHeader />
      <PageMain>
        <WhenLoaded>{panels}</WhenLoaded>
        <PageLoadError />
        <Columns>
          <PageColumn restaurant="r1">{r1}</PageColumn>
          <PageColumn restaurant="r2">{r2}</PageColumn>
        </Columns>
      </PageMain>
    </Page>
  );
}

function titles(container: HTMLElement): string[] {
  return [...container.querySelectorAll("h2")].map((title) => title.textContent);
}

describe("Page before any data (G-01, 03 § 3)", () => {
  it("shows the default titles and the skeleton, without any text about loading", async () => {
    const release = fakeScript().hold();
    const { screen } = await renderWithProviders(<TestPage />);
    await expect.element(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
    expect(titles(screen.container)).toStrictEqual(["Restaurant Pédagogique", "Aristide"]);
    await expect
      .element(screen.getByRole("heading", { level: 1 }))
      .toHaveTextContent("Réservations des restaurants pédagogiques et Aristide");
    expect(screen.container.textContent).not.toMatch(/Chargement/u);
    expect(screen.container.querySelector('[role="alert"]')).toBeNull();
    release();
  });

  it("shows the titles of the last visit (reservations-textes, 03 § 1.2)", async () => {
    localStorage.setItem(
      "reservations-textes",
      JSON.stringify({ name1: "Resto Test", name2: "", desc1: "Description mémorisée" }),
    );
    const release = fakeScript().hold();
    const { screen } = await renderWithProviders(<TestPage />);
    // An empty value keeps the default (04 § 2).
    expect(titles(screen.container)).toStrictEqual(["Resto Test", "Aristide"]);
    await expect.element(screen.getByText("Description mémorisée")).toBeVisible();
    await expect
      .element(
        screen.getByText("Table côté Resto Test · Plats à emporter ou sur place côté Aristide"),
      )
      .toBeVisible();
    release();
  });
});

describe("Page with data (G-02, G-04, D-24)", () => {
  it("shows the names and descriptions of the state, the title derived from name2", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(
      publicStateOptions.queryKey,
      publicState({ settings: { ...SETTINGS, name1: "Le Gourmet", name2: "Bistrot", desc2: "" } }),
    );
    const { screen } = await renderWithProviders(<TestPage />, { queryClient });
    await expect.element(screen.getByRole("main")).toHaveAttribute("aria-busy", "false");
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
    await expect
      .element(
        screen.getByText(
          "Les places se mettent à jour automatiquement toutes les 3 minutes. Vous pouvez aussi actualiser la page.",
        ),
      )
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

  it("shows the staff panels once the state is there, above the columns (06 § 2)", async () => {
    const release = fakeScript().hold();
    const { screen } = await renderWithProviders(<TestPage panels={<p>Panneau</p>} />);
    expect(screen.container.textContent).not.toMatch(/Panneau/u);
    release();
    await expect.element(screen.getByText("Panneau")).toBeVisible();
    const main = screen.getByRole("main").element();
    expect(main.firstElementChild?.textContent).toBe("Panneau");
  });
});

describe("Page after a failed read (G-03, 03 § 3, § 5.2)", () => {
  it("shows the load error box and stops the skeleton, then the data after « Réessayer »", async () => {
    fakeScript().failNext("error");
    const { screen } = await renderWithProviders(<TestPage r1={<p>Fiche R1</p>} />, {
      queryClient: clientWithoutRetry(),
    });
    await expect.poll(() => alertText(screen.container)).toMatch(ONLINE_TITLE);
    expect(screen.container.querySelector('[data-still="true"]')).not.toBeNull();
    await expect.element(screen.getByRole("main")).toHaveAttribute("aria-busy", "false");
    await screen.getByRole("button", { name: "Réessayer" }).click();
    await expect.element(screen.getByText("Fiche R1")).toBeVisible();
    expect(screen.container.querySelector('[role="alert"]')).toBeNull();
  });

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

describe("Page and hydration (arbitrage 16)", () => {
  it("hydrates the markup of PageSkeleton without mismatch, then shows the local copy", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(
      publicStateOptions.queryKey,
      publicState({ settings: { ...SETTINGS, name1: "De la copie" } }),
    );
    // The prerendered shell holds PageSkeleton with the default titles.
    const shell = document.createElement("div");
    const shellRoot = createRoot(shell);
    flushSync(() => {
      shellRoot.render(
        <TestProviders queryClient={createQueryClient()}>
          <PageSkeleton />
        </TestProviders>,
      );
    });
    const container = document.createElement("div");
    container.innerHTML = shell.innerHTML;
    shellRoot.unmount();
    document.body.append(container);
    // Test only: React reports a hydration mismatch (error #418) here instead of in the console.
    const mismatches: unknown[] = [];
    const root = hydrateRoot(
      container,
      <TestProviders queryClient={queryClient}>
        <TestPage />
      </TestProviders>,
      { onRecoverableError: (error) => mismatches.push(error) },
    );
    await expect.poll(() => titles(container)).toStrictEqual(["De la copie", "Aristide"]);
    expect(mismatches).toStrictEqual([]);
    root.unmount();
    container.remove();
  });

  it("mounts a single refreshing observer (PLAN § 3.3.2, R-18)", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(publicStateOptions.queryKey, publicState());
    await renderWithProviders(<TestPage />, { queryClient });
    const query = queryClient.getQueryCache().find({ queryKey: publicStateOptions.queryKey });
    const intervals = query?.observers.map((observer) => observer.options.refetchInterval);
    expect(intervals?.filter((interval) => interval !== undefined)).toStrictEqual([180_000]);
  });
});
