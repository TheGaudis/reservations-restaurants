import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { useClock } from "@/background/clock";
import { BookingFormR1Slot } from "@/features/r1/BookingFormR1Slot";
import { DayCardR1 } from "@/features/r1/DayCardR1";
import { stateKeys } from "@/queries/state";
import { fakeScript } from "@/test/browser-fake-script";
import { TEST_NOW } from "@/test/clock";
import { renderColumn } from "@/test/column-page";
import { urlParams } from "@/test/public-page";

// R1 booking form on the public page (04 § 5.1-5.2, § 5.4, § 6, § 7; D-10, D-14, D-16, D-18; E-12, E-13, E-35), on
// the seed of parite.md § 2: Monday 5 October 2026 has 12 seats left out of 20, Tuesday 6 has 5.

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(TEST_NOW);
});

const initialClock = useClock.getState();

afterEach(() => {
  useClock.setState(initialClock, true);
  vi.useRealTimers();
  localStorage.clear();
});

const column = () => page;
const renderPage = async (url: string) =>
  renderColumn(url, "r1", <DayCardR1 form={<BookingFormR1Slot />} />);
const field = (name: string | RegExp) => column().getByRole("textbox", { name });
const button = (name: string) => column().getByRole("button", { name, exact: true });
const reserve = () => button("Réserver");
const submit = () =>
  column().getByRole("button", { name: /^(Confirmer la réservation|Envoi en cours…)$/u });

function posts() {
  return fakeScript()
    .requests.filter((request) => request.method === "POST")
    .map((request) => request.json as Record<string, unknown>);
}

async function openForm(url = "/") {
  const rendered = await renderPage(url);
  await userEvent.click(reserve());
  await expect.element(field("Nom et prénom")).toHaveFocus();
  return rendered;
}

async function fill(values: {
  name?: string;
  contact?: string;
  className?: string;
  students?: string;
}) {
  if (values.name !== undefined) await userEvent.type(field("Nom et prénom"), values.name);
  if (values.contact !== undefined) await userEvent.type(field("Adresse email"), values.contact);
  if (values.className !== undefined) {
    await userEvent.type(field("Classe ou service"), values.className);
  }
  if (values.students !== undefined) await userEvent.type(field(/^Élèves/u), values.students);
}

const PERSON = { name: "Jean Dupuis", contact: "jean.dupuis@exemple.fr", className: "TS2" };

describe("opening (04 § 5.1-5.2)", () => {
  it("opens empty under the card, focus on the name, with the legend, prices and exact total", async () => {
    const { router } = await openForm();
    expect(urlParams(router)).toStrictEqual(["r1=2026-10-05", "reserver=r1"]);
    await expect.element(reserve()).not.toBeInTheDocument();
    await expect.element(field("Nom et prénom")).toHaveValue("");
    await expect
      .element(column().getByRole("group", { name: "Nombre de personnes (12 au maximum)" }))
      .toBeVisible();
    await expect.element(field("Élèves · 4,95\u00A0€")).toBeVisible();
    await expect.element(field("Personnels · 6,10\u00A0€")).toBeVisible();
    await expect.element(field("Extérieurs · 9,90\u00A0€")).toBeVisible();
    expect(
      column()
        .getByText(/Total :/u)
        .element().textContent,
    ).toBe("0 couvert · Total : 0,00\u00A0€");
    await expect.element(button("Diminuer : Élèves")).toBeInTheDocument();
    await expect.element(button("Augmenter : Extérieurs")).toBeInTheDocument();
  });

  it("updates the live total (« 3 couverts · Total : 16,00 € », 04 § 5.2)", async () => {
    await openForm();
    await userEvent.type(field(/^Élèves/u), "2");
    await userEvent.type(field(/^Personnels/u), "1");
    await expect
      .element(column().getByText("3 couverts · Total : 16,00\u00A0€", { exact: true }))
      .toBeVisible();
  });

  it("gives the focus back to « Réserver » after « Annuler », and sends nothing", async () => {
    const { router } = await openForm();
    await fill({ name: "Jean" });
    await userEvent.click(button("Annuler"));
    await expect.element(reserve()).toHaveFocus();
    expect(urlParams(router)).toStrictEqual(["r1=2026-10-05"]);
    expect(posts()).toStrictEqual([]);
    // A new opening starts empty (D-10).
    await userEvent.click(reserve());
    await expect.element(field("Nom et prénom")).toHaveValue("");
  });

  it("does not open on a deep link to a full day", async () => {
    await renderPage("/?r1=2026-10-09&reserver=r1");
    await expect.element(column().getByText("Complet.", { exact: true })).toBeVisible();
    await expect.element(field("Nom et prénom")).not.toBeInTheDocument();
  });
});

describe("validation (04 § 5.2, § 5.4, D-18)", () => {
  it("shows every message once, the row message under the counters, focus on the name", async () => {
    await openForm();
    await userEvent.click(submit());
    await expect
      .element(field("Nom et prénom"))
      .toHaveAccessibleDescription("Indiquez vos nom et prénom.");
    await expect.element(field("Nom et prénom")).toHaveFocus();
    await expect
      .element(field("Adresse email"))
      .toHaveAccessibleDescription(
        "Indiquez votre adresse email. Pour vous envoyer la confirmation.",
      );
    await expect
      .element(field("Classe ou service"))
      .toHaveAccessibleDescription("Indiquez votre classe ou votre service.");
    await expect.element(column().getByText("Indiquez au moins une personne.")).toBeVisible();
    await Promise.all(
      [/^Élèves/u, /^Personnels/u, /^Extérieurs/u].map(async (counter) => {
        await expect.element(field(counter)).toHaveAttribute("aria-invalid", "true");
        await expect
          .element(field(counter))
          .toHaveAccessibleDescription("Indiquez au moins une personne.");
      }),
    );
    expect(posts()).toStrictEqual([]);
  });

  it("focuses the first counter when the row is the only error", async () => {
    await openForm();
    await fill(PERSON);
    await userEvent.click(submit());
    await expect.element(field(/^Élèves/u)).toHaveFocus();
  });

  it("refuses more seats than left before sending (D-18, E-35)", async () => {
    await openForm("/?r1=2026-10-06");
    await fill({ ...PERSON, students: "6" });
    await userEvent.click(submit());
    await expect
      .element(
        column().getByText("5 couverts au maximum (places restantes ce jour-là).", { exact: true }),
      )
      .toBeVisible();
    expect(posts()).toStrictEqual([]);
  });
});

describe("sending (04 § 6, § 7)", () => {
  it("sends the trimmed texts with the requestId, then shows the summary with the focus and closes", async () => {
    const { router } = await openForm();
    await fill({
      name: "  Jean Dupuis ",
      contact: " jean.dupuis@exemple.fr ",
      className: " TS2 ",
      students: "2",
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
    await expect
      .element(page.getByText("Réservation confirmée.", { exact: true }).first())
      .toBeVisible();
    await expect.element(field("Nom et prénom")).not.toBeInTheDocument();
    expect(urlParams(router)).toStrictEqual(["r1=2026-10-05"]);
    const [body] = posts();
    expect(body).toStrictEqual(
      expect.objectContaining({
        action: "addBookingR1",
        date: "2026-10-05",
        requestId: expect.any(String) as unknown,
      }),
    );
    expect(Object.values(body ?? {})).toStrictEqual(
      expect.arrayContaining(["Jean Dupuis", "jean.dupuis@exemple.fr", "TS2"]),
    );
    // 10 seats left: « Réserver » comes back under the summary (04 § 6.3).
    await expect.element(column().getByText("10 / 20 couverts", { exact: true })).toBeVisible();
    await expect.element(reserve()).toBeVisible();
  });

  it("keeps the form and the requestId after an error, a refresh included; a new opening gets a new one", async () => {
    const { queryClient } = await openForm();
    await fill({ ...PERSON, students: "1" });
    fakeScript().failNext("error");
    await userEvent.click(submit());
    await expect
      .element(
        page.getByText("Le serveur est très sollicité : réessayez dans quelques secondes.").first(),
      )
      .toBeVisible();
    await expect.element(field("Nom et prénom")).toHaveValue(PERSON.name);
    await queryClient.invalidateQueries({ queryKey: stateKeys.public() });
    await userEvent.click(submit());
    await expect
      .element(column().getByText("Réservation enregistrée", { exact: true }))
      .toBeVisible();
    await userEvent.click(reserve());
    await fill({ ...PERSON, students: "1" });
    await userEvent.click(submit());
    await expect.poll(() => posts().length).toBe(3);
    const ids = posts().map((body) => body["requestId"]);
    expect(ids[1]).toBe(ids[0]);
    expect(ids[2]).not.toBe(ids[0]);
  });

  it("words a lost answer with D-14, then shows the duplicate summary (D-16)", async () => {
    await openForm();
    await fill({ ...PERSON, students: "2" });
    fakeScript().failNext("network");
    await userEvent.click(submit());
    await expect
      .element(
        page
          .getByText(
            /^Le service de réservation ne répond pas\. Réessayez dans un instant : une même réservation n.est jamais enregistrée deux fois\.$/u,
          )
          .first(),
      )
      .toBeVisible();
    await userEvent.click(submit());
    await expect.element(column().getByText("Réservation déjà enregistrée")).toHaveFocus();
    await expect
      .element(
        column()
          .getByRole("status")
          .getByText(
            /^Cette réservation était déjà enregistrée : elle n.a pas été ajoutée une seconde fois\.$/u,
          ),
      )
      .toBeVisible();
  });

  it("shows the script's refusal under the counters and reads the state again (E-35)", async () => {
    await openForm("/?r1=2026-10-06");
    await fill({ ...PERSON, students: "3" });
    const reads = () => fakeScript().requests.filter((request) => request.method === "GET").length;
    const readsBefore = reads();
    // Another visitor took seats meanwhile: the script refuses (02 § 4.4, step 5).
    fakeScript().failNext("error", "Il ne reste que 2 couvert(s) pour ce jour.");
    await userEvent.click(submit());
    await expect
      .element(column().getByText("Il ne reste que 2 couvert(s) pour ce jour.", { exact: true }))
      .toBeVisible();
    await expect
      .element(field(/^Élèves/u))
      .toHaveAccessibleDescription("Il ne reste que 2 couvert(s) pour ce jour.");
    await expect.poll(reads).toBe(readsBefore + 1);
    await expect.element(field(/^Élèves/u)).toHaveValue("3");
    expect(document.querySelector('[aria-label="Notifications"]')?.textContent).toBe("");
  });

  it("removes the summary when a day is chosen in the same calendar (04 § 7)", async () => {
    await openForm();
    await fill({ ...PERSON, students: "1" });
    await userEvent.click(submit());
    const summary = column().getByText("Réservation enregistrée", { exact: true });
    await expect.element(summary).toBeVisible();
    await userEvent.click(column().getByRole("button", { name: /^lundi 5 octobre 2026/u }));
    await expect.element(summary).not.toBeInTheDocument();
  });
});
