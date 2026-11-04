import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { addBookingR2Multi } from "@/api/actions";
import { useClock, watchR2Cutoff } from "@/background/clock";
import { DayCardR2 } from "@/features/r2/DayCardR2";
import { purgeStaffSession } from "@/queries/purge";
import { stateKeys } from "@/queries/state";
import { useSessionStore } from "@/session/session";
import { fakeScript } from "@/test/browser-fake-script";
import { TEST_NOW } from "@/test/clock";
import { renderColumn } from "@/test/column-page";
import { urlParams } from "@/test/public-page";
import { showToast } from "@/ui/feedback/toast";

// R2 order form on the public page, sending included (04 § 5.1, § 5.3, § 5.4, § 6, § 7; D-10, D-14, D-16 to D-18;
// E-09, E-11 to E-14, E-41; invariants 3 to 5): one public R2 column with its form, on the fake script of the test
// (`renderColumn`, R-36). Seed of parite.md § 2: Monday 5 October 2026, 9:30, is a voucher day (Lasagnes 4 left out
// of 10 at 4,50 €, Bowl and Wrap paid with a voucher, Salade without a price); Tuesday 13 has no voucher dish.

const CLOSED =
  "Commandes en ligne clôturées à 10h. Venez au restaurant Aristide à partir de 12h pour commander sur place.";
const NO_DISH = "Choisissez au moins un plat.";

const initialClock = useClock.getState();
let stops: Array<() => void> = [];

// Date at TEST_NOW for each test; clock, background task and local copy put back afterwards.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(TEST_NOW);
});
afterEach(() => {
  for (const stop of stops) stop();
  stops = [];
  useClock.setState(initialClock, true);
  vi.useRealTimers();
  localStorage.clear();
});

const column = () => page;
const renderPage = async (url: string) => renderColumn(url, "r2", <DayCardR2 />);
const field = (name: string | RegExp) => column().getByRole("textbox", { name });
const quantity = (dish: string) => field(`Quantité : ${dish}`);
const button = (name: string) => column().getByRole("button", { name, exact: true });
const reserve = () => button("Réserver");
const submit = () =>
  column().getByRole("button", { name: /^(Confirmer la réservation|Envoi en cours…)$/u });
const toastText = (text: string | RegExp) => page.getByText(text).first();

/** Orders sent by the form, without those of `otherVisitorTakes`. */
function posts() {
  return fakeScript()
    .requests.filter((request) => request.method === "POST")
    .map((request) => request.json as Record<string, unknown>)
    .filter((body) => !String(body["requestId"]).startsWith("other-"));
}

/** Total as rendered, non-breaking spaces kept; empty when nothing priced is chosen. */
function liveTotal(): string {
  const total = column()
    .getByText(/^Total/u)
    .elements();
  return total.map((element) => element.textContent).join("|");
}

async function openForm(url = "/") {
  const rendered = await renderPage(url);
  await userEvent.click(reserve());
  await expect.element(quantity("Lasagnes")).toHaveFocus();
  return rendered;
}

async function typeQuantity(dish: string, value: string) {
  await userEvent.clear(quantity(dish));
  if (value !== "") await userEvent.type(quantity(dish), value);
}

const PERSON = {
  name: "Ariele Gsell",
  contact: "a.gsell@exemple.fr",
  className: "Vie scolaire",
};

async function fillPerson(person: { name: string; contact: string; className: string } = PERSON) {
  await userEvent.type(field("Nom et prénom"), person.name);
  await userEvent.type(field("Adresse email"), person.contact);
  await userEvent.type(field("Classe ou service"), person.className);
}

/** Another visitor orders through the script meanwhile (02 § 4.5). */
async function otherVisitorTakes(dishId: string, portions: number) {
  await addBookingR2Multi({
    date: "2026-10-05",
    name: "Autre visiteur",
    contact: "",
    className: "TS1",
    serviceMode: "dineIn",
    items: [{ dishId, portions }],
    observation: "",
    requestId: `other-${dishId}`,
  });
}

/** The 10:00 task of `getRouter()` (background/start.ts), on the router and cache of the test. */
function watchCutoff(rendered: Awaited<ReturnType<typeof renderPage>>) {
  stops.push(
    watchR2Cutoff({
      router: rendered.router,
      queryClient: rendered.queryClient,
      session: useSessionStore,
      purgeStaffSession,
      showToast,
    }),
  );
}

describe("opening (04 § 5.1, § 5.3)", () => {
  it("folds the dish list, focuses the first quantity, offers dine-in only on a voucher day", async () => {
    const { router } = await openForm();
    expect(urlParams(router)).toStrictEqual(["r2=2026-10-05", "reserver=r2"]);
    await expect.element(column().getByText("4 / 10", { exact: true })).not.toBeInTheDocument();
    await expect.element(reserve()).not.toBeInTheDocument();
    await expect
      .element(column().getByRole("group", { name: "Choisissez vos plats et quantités" }))
      .toBeVisible();
    await expect.element(column().getByText("4 disponibles", { exact: true })).toBeVisible();
    await expect.element(column().getByText("10 disponibles", { exact: true })).toBeVisible();
    await expect.element(column().getByRole("radio")).toHaveAccessibleName("Sur place");
    await expect.element(column().getByRole("radio")).toBeChecked();
    await expect
      .element(
        column().getByText(
          "Sur place uniquement ce jour-là : repas au prix d'un ticket restaurant.",
          { exact: true },
        ),
      )
      .toBeVisible();
    await expect.element(button("Ajouter une portion : Lasagnes")).toBeInTheDocument();
    await expect.element(button("Retirer une portion : Salade")).toBeInTheDocument();
    expect(liveTotal()).toBe("");
  });

  it("gives the focus back to « Réserver » after « Annuler », and a new opening starts empty (D-10)", async () => {
    const { router } = await openForm();
    await typeQuantity("Lasagnes", "2");
    await userEvent.type(field("Nom et prénom"), "Ariele");
    await userEvent.click(button("Annuler"));
    await expect.element(reserve()).toHaveFocus();
    await expect.element(column().getByText("4 / 10", { exact: true })).toBeVisible();
    expect(urlParams(router)).toStrictEqual(["r2=2026-10-05"]);
    expect(posts()).toStrictEqual([]);
    await userEvent.click(reserve());
    await expect.element(quantity("Lasagnes")).toHaveValue("");
    await expect.element(field("Nom et prénom")).toHaveValue("");
  });
});

describe("validation (04 § 5.3, § 5.4, D-18, E-41)", () => {
  it("shows every message at once, the focus on the first invalid field in DOM order", async () => {
    await openForm();
    await userEvent.click(submit());
    await expect.element(column().getByText(NO_DISH, { exact: true })).toBeVisible();
    await expect
      .element(field("Nom et prénom"))
      .toHaveAccessibleDescription("Indiquez vos nom et prénom.");
    await expect
      .element(field("Adresse email"))
      .toHaveAccessibleDescription(
        "Indiquez votre adresse email. Pour vous envoyer la confirmation.",
      );
    await expect
      .element(field("Classe ou service"))
      .toHaveAccessibleDescription("Indiquez votre classe ou votre service.");
    await expect.element(quantity("Lasagnes")).toHaveFocus();
  });

  it("refuses more portions than left after the state was read again (D-18)", async () => {
    const { queryClient } = await openForm();
    await fillPerson();
    await typeQuantity("Lasagnes", "3");
    await otherVisitorTakes("r2i-d0-lasagnes", 2);
    await queryClient.invalidateQueries({ queryKey: stateKeys.public() });
    await expect.element(column().getByText("2 disponibles", { exact: true })).toBeVisible();
    await userEvent.click(submit());
    await expect
      .element(column().getByText("2 portions au maximum (stock restant).", { exact: true }))
      .toBeVisible();
    expect(posts()).toStrictEqual([]);
  });
});

/** Dish id and portions of each item of an order body, in the order sent. */
function dishLines(body: Record<string, unknown>): unknown[][] {
  const items = body["items"];
  if (!Array.isArray(items)) return [];
  return items.map((item: unknown): unknown[] =>
    typeof item === "object" && item !== null ? Object.values(item) : [],
  );
}

describe("sending (04 § 6, § 7)", () => {
  it("sends the exact body once, then shows the summary with the focus and closes", async () => {
    const { router } = await openForm();
    await typeQuantity("Salade", "1");
    await typeQuantity("Lasagnes", "2");
    await fillPerson({
      name: "  Ariele Gsell ",
      contact: " a.gsell@exemple.fr ",
      className: " VS ",
    });
    const release = fakeScript().hold();
    await userEvent.click(submit());
    // Busy button, « Annuler » disabled (04 § 6.1, E-13).
    await expect.element(button("Envoi en cours…")).toHaveAttribute("aria-busy", "true");
    await expect.element(button("Annuler")).toBeDisabled();
    await expect.poll(() => posts().length).toBe(1);
    release();

    const title = column().getByText("Réservation enregistrée", { exact: true });
    await expect.element(title).toHaveFocus();
    await expect.element(toastText("Réservation confirmée.")).toBeVisible();
    await expect.element(field("Nom et prénom")).not.toBeInTheDocument();
    expect(urlParams(router)).toStrictEqual(["r2=2026-10-05"]);
    // Dine-in on a voucher day (invariant 5); dishes in the order of the sheet; texts trimmed (04 § 6.2).
    // Values of the body in the order of api/actions.ts, whose names are checked there and by REG-23.
    const [body = {}] = posts();
    expect(Object.values(body)).toStrictEqual([
      "addBookingR2Multi",
      "2026-10-05",
      "Ariele Gsell",
      "a.gsell@exemple.fr",
      "VS",
      expect.any(String),
      expect.any(Array),
      "",
      expect.any(String),
    ]);
    expect(dishLines(body)).toStrictEqual([
      ["r2i-d0-lasagnes", 2],
      ["r2i-d0-salade", 1],
    ]);
    const summary = column().getByRole("status").filter({ hasText: "Réservation enregistrée" });
    await expect.element(summary.getByText("Sur place", { exact: true })).toBeVisible();
    await expect.element(summary.getByText("× 2", { exact: true })).toBeVisible();
    await expect
      .element(summary.getByText("9,00 € (hors plats sans prix indiqué)", { exact: true }))
      .toBeVisible();
    // The list comes back with the stock left, and « Réserver » under the summary (04 § 6.3).
    await expect.element(column().getByText("2 / 10", { exact: true })).toBeVisible();
    await expect.element(reserve()).toBeVisible();
  });

  it("keeps the form and the requestId after an error; a lost answer then gets the duplicate summary (D-14, D-16)", async () => {
    await openForm();
    await typeQuantity("Lasagnes", "1");
    await fillPerson();
    fakeScript().failNext("error");
    await userEvent.click(submit());
    await expect
      .element(toastText("Le serveur est très sollicité : réessayez dans quelques secondes."))
      .toBeVisible();
    await expect.element(quantity("Lasagnes")).toHaveValue("1");
    fakeScript().failNext("network");
    await userEvent.click(submit());
    await expect.element(toastText(/^Le service de réservation ne répond pas\./u)).toBeVisible();
    await userEvent.click(submit());
    await expect.element(column().getByText("Réservation déjà enregistrée")).toHaveFocus();
    const summary = column().getByRole("status");
    await expect.element(summary.getByText("× 1", { exact: true })).toBeVisible();
    const ids = posts().map((body) => body["requestId"]);
    expect(new Set(ids).size).toBe(1);
    expect(ids).toHaveLength(3);
  });
});

describe("cut-off at 10:00 (04 § 5.3, invariant 4, E-09)", () => {
  it("closes the form on sending past 10:00, before the rules, and sends nothing", async () => {
    const rendered = await openForm();
    watchCutoff(rendered);
    await typeQuantity("Lasagnes", "1");
    vi.setSystemTime(Date.parse("2026-10-05T08:00:01.000Z"));
    // Identity left empty: the cut-off comes first.
    await userEvent.click(submit());
    await expect.element(toastText(CLOSED)).toBeVisible();
    await expect.element(quantity("Lasagnes")).not.toBeInTheDocument();
    await expect.element(column().getByText(/^Indiquez/u)).not.toBeInTheDocument();
    await expect.element(column().getByText(CLOSED, { exact: true }).last()).toBeVisible();
    expect(urlParams(rendered.router)).toStrictEqual(["r2=2026-10-05"]);
    expect(posts()).toStrictEqual([]);
  });
});
