import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { useClock } from "@/background/clock";
import { StaffDayCardR1 } from "@/features/staff/StaffDayCardR1";
import { fakeScript } from "@/test/browser-fake-script";
import { TEST_NOW } from "@/test/clock";
import { urlParams } from "@/test/public-page";
import { actionPosts, expectToast, renderStaffColumn } from "@/test/staff-column";

// « + Ajouter une personne » of the R1 staff card (06 § 8.1-8.2, § 8.5; invariant 3; D-14; E-48; C-12), on the seed of
// parite.md § 2: Tuesday 6 October 2026 has 5 seats left out of 20, Friday 9 October none, Thursday 1 October is past.

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(TEST_NOW);
});

const initialClock = useClock.getState();

afterEach(() => {
  useClock.setState(initialClock, true);
  vi.useRealTimers();
});

const ADD = "+ Ajouter une personne";
const field = (name: string | RegExp) => page.getByRole("textbox", { name });
const button = (name: string) => page.getByRole("button", { name, exact: true });
const submit = () =>
  page.getByRole("button", { name: /^(Ajouter cette personne|Ajout en cours…)$/u });

/** Bodies of `addBookingR1` as values, in the order of 02 § 4.4 (no script field name out of api/, R-36). */
function additions() {
  return actionPosts("addBookingR1").map((body) => Object.values(body));
}

async function renderCard(day = "2026-10-06") {
  const rendered = await renderStaffColumn(`/collegue?r1=${day}`, "r1", <StaffDayCardR1 />);
  await expect.element(page.getByText(/couverts$/u).first()).toBeVisible();
  return rendered;
}

async function openForm() {
  const rendered = await renderCard();
  await userEvent.click(button(ADD));
  await expect.element(field("Nom et prénom")).toHaveFocus();
  return rendered;
}

async function fillPerson(name: string, students: string) {
  await userEvent.type(field("Nom et prénom"), name);
  await userEvent.type(field("Classe ou service"), "TS2");
  await userEvent.type(field(/^Élèves/u), students);
}

describe("button (06 § 8, 05 § 5.3)", () => {
  it("is the first action of a past day with seats left", async () => {
    await renderCard("2026-10-01");
    await expect.element(button(ADD)).toHaveAttribute("aria-expanded", "false");
    const actions = button(ADD).element().parentElement;
    expect(actions?.querySelector("button")?.textContent).toBe(ADD);
  });

  it("is absent when no seat is left", async () => {
    await renderCard("2026-10-09");
    await expect.element(page.getByText("0 / 10 couverts", { exact: true })).toBeVisible();
    await expect.element(button(ADD)).not.toBeInTheDocument();
  });
});

describe("form (06 § 8.1-8.2)", () => {
  it("opens with the focus on the name, the seats left and the optional e-mail", async () => {
    const { router } = await openForm();
    await expect.element(button(ADD)).toHaveAttribute("aria-expanded", "true");
    expect(urlParams(router)).toStrictEqual(["ajout=r1", "r1=2026-10-06"]);
    await expect
      .element(page.getByRole("group", { name: "Nombre de personnes (5 au maximum)" }))
      .toBeVisible();
    await expect
      .element(field("Adresse email (optionnel)"))
      .toHaveAccessibleDescription("Si elle est indiquée, la confirmation y est envoyée.");
    await expect
      .element(field("Nom et prénom"))
      .toHaveAttribute("placeholder", "Ex. Cyrille Ungerer");
  });

  it("checks name, class, e-mail when typed and seats before sending, every message at once", async () => {
    await openForm();
    await userEvent.click(submit());
    await expect.element(page.getByText("Indiquez le nom.", { exact: true })).toBeVisible();
    await expect
      .element(page.getByText("Indiquez la classe ou le service.", { exact: true }))
      .toBeVisible();
    await expect
      .element(page.getByText("Indiquez au moins une personne.", { exact: true }))
      .toBeVisible();
    await fillPerson("Zoé Lambert", "6");
    await userEvent.type(field("Adresse email (optionnel)"), "zoe@");
    await expect
      .element(
        page.getByText("Vérifiez votre adresse email (ex. Ariele.gsell@exemple.fr).", {
          exact: true,
        }),
      )
      .toBeVisible();
    await expect
      .element(
        page.getByText("5 couverts au maximum (places restantes ce jour-là).", { exact: true }),
      )
      .toBeVisible();
    expect(additions()).toStrictEqual([]);
  });
});

describe("sending (06 § 8.2, § 8.5, 02 § 4.4)", () => {
  it("sends without password, toasts, closes, gives the focus back and reads the full state again", async () => {
    const { router } = await openForm();
    const reads = () => actionPosts("getAdminState").length;
    const readsBefore = reads();
    await fillPerson("Zoé Lambert", "2");
    await userEvent.type(field(/^Personnels/u), "1");
    await expect
      .element(page.getByText("3 couverts · Total : 16,00 €", { exact: true }))
      .toBeVisible();
    const release = fakeScript().hold();
    await userEvent.click(submit());
    await expect.element(submit()).toHaveTextContent("Ajout en cours…");
    await expect.element(button("Annuler")).toBeDisabled();
    release();
    await expectToast("Personne ajoutée.");
    expect(additions()).toStrictEqual([
      ["addBookingR1", "2026-10-06", "Zoé Lambert", "", "TS2", 2, 1, 0, "", expect.any(String)],
    ]);
    expect(reads()).toBeGreaterThan(readsBefore);
    await expect.element(page.getByText(/^Zoé Lambert — TS2 — 3 couverts/u)).toBeVisible();
    await expect.element(field("Nom et prénom")).not.toBeInTheDocument();
    await expect.element(button(ADD)).toHaveFocus();
    expect(urlParams(router)).toStrictEqual(["r1=2026-10-06"]);
  });

  it("keeps input and requestId after a lost answer; the new attempt is a duplicate, not an error", async () => {
    await openForm();
    await fillPerson("Hugo Weber", "1");
    fakeScript().failNext("network");
    await userEvent.click(submit());
    await expectToast("Le service ne répond pas. Réessayez dans un instant.");
    await expect.element(field("Nom et prénom")).toHaveValue("Hugo Weber");
    await userEvent.click(submit());
    await expectToast(
      "Cette personne était déjà enregistrée : elle n'a pas été ajoutée une seconde fois.",
    );
    const [lost, retry] = additions();
    expect(retry?.at(-1)).toBe(lost?.at(-1));
  });

  it("renews the requestId at each opening (invariant 3)", async () => {
    await openForm();
    await fillPerson("Hugo Weber", "1");
    fakeScript().failNext(
      "error",
      "Le serveur est très sollicité : réessayez dans quelques secondes.",
    );
    await userEvent.click(submit());
    await expectToast("Le serveur est très sollicité : réessayez dans quelques secondes.");
    await userEvent.click(button("Annuler"));
    await expect.element(button(ADD)).toHaveFocus();
    await userEvent.click(button(ADD));
    await expect.element(field("Nom et prénom")).toHaveValue("");
    await fillPerson("Hugo Weber", "1");
    await userEvent.click(submit());
    await expectToast("Personne ajoutée.");
    const [first, second] = additions();
    expect(second?.at(-1)).not.toBe(first?.at(-1));
  });

  it("shows the script's refusal for lack of seats under the counters (a-5)", async () => {
    await openForm();
    await fillPerson("Hugo Weber", "1");
    fakeScript().failNext("error", "Il ne reste que 0 couvert(s) pour ce jour.");
    await userEvent.click(submit());
    await expect
      .element(field(/^Élèves/u))
      .toHaveAccessibleDescription("Il ne reste que 0 couvert(s) pour ce jour.");
    await expect.element(field("Nom et prénom")).toHaveValue("Hugo Weber");
  });

  it("says in the error style that the e-mail could not be sent", async () => {
    await openForm();
    fakeScript().db.mailError = "Service invoked too many times for one day: email.";
    await fillPerson("Zoé Lambert", "1");
    await userEvent.type(field("Adresse email (optionnel)"), "zoe@exemple.fr");
    await userEvent.click(submit());
    const text = "Personne ajoutée. L'email de confirmation n'a pas pu être envoyé.";
    await expectToast(text);
    // An error toast is an `alertdialog` of Base UI.
    await vi.waitFor(() => {
      const errors = [...document.querySelectorAll('[role="alertdialog"][data-type="error"]')];
      expect(errors.map((toast) => toast.textContent)).toContain(text);
    });
  });

  it("hands the focus to the date of the card when the last seats are taken (03 § 5.4)", async () => {
    await openForm();
    await fillPerson("Zoé Lambert", "5");
    await userEvent.click(submit());
    await expectToast("Personne ajoutée.");
    await expect.element(button(ADD)).not.toBeInTheDocument();
    await expect.element(page.getByText(/^mardi 6 octobre 2026$/u)).toHaveFocus();
  });
});

describe("closing", () => {
  it("« Annuler » sends nothing and gives the focus back to the button (E-48)", async () => {
    const { router } = await openForm();
    await userEvent.type(field("Nom et prénom"), "Zoé");
    await userEvent.click(button("Annuler"));
    await expect.element(field("Nom et prénom")).not.toBeInTheDocument();
    await expect.element(button(ADD)).toHaveFocus();
    await expect.element(button(ADD)).toHaveAttribute("aria-expanded", "false");
    expect(urlParams(router)).toStrictEqual(["r1=2026-10-06"]);
    expect(additions()).toStrictEqual([]);
  });
});
