import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { addBookingR2Multi } from "@/api/actions";
import { useClock } from "@/background/clock";
import type { EmailStatus, WriteResponse } from "@/domain/types";
import { addButtonId, addedToast, ajoutValue } from "@/features/staff/AddBookingForm";
import { StaffDayCardR1 } from "@/features/staff/StaffDayCardR1";
import { StaffDayCardR2 } from "@/features/staff/StaffDayCardR2";
import { fakeScript } from "@/test/browser-fake-script";
import { TEST_NOW } from "@/test/clock";
import { urlParams } from "@/test/public-page";
import { actionPosts, expectToast, renderStaffColumn } from "@/test/staff-column";

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

describe("R1 card (06 § 8.1-8.2)", () => {
  // « + Ajouter une personne » of the R1 staff card (06 § 8.1-8.2, § 8.5; invariant 3; D-14; E-48; C-12), on the seed of
  // parite.md § 2: Tuesday 6 October 2026 has 5 seats left out of 20, Friday 9 October none, Thursday 1 October is past.

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
});

describe("R2 dish (06 § 8.3)", () => {
  // « + Ajouter une personne » under each dish of the R2 staff card (06 § 8.1, § 8.3-8.5; D-19; E-36; E-48; C-23), on
  // the seed of parite.md § 2: today's Lasagnes have 4 portions left out of 10, today is a voucher day; on Tuesday
  // 13 October no dish is paid with a voucher; on Sunday 11 October every dish is sold out.

  const LASAGNES = "r2i-d0-lasagnes";

  /** Bodies of `addBookingR2Multi` as values, in the order of 02 § 4.5 (no script field name out of api/). */
  function orders() {
    return actionPosts("addBookingR2Multi").map((body) => Object.values(body));
  }

  /** Another visitor orders `portions` of today's Lasagnes. */
  async function otherOrder(portions: number) {
    await addBookingR2Multi({
      date: "2026-10-05",
      name: "Autre Client",
      contact: "",
      className: "Personnel",
      serviceMode: "dineIn",
      items: [{ dishId: LASAGNES, portions }],
      observation: "",
      requestId: `other-${String(portions)}`,
    });
  }

  async function renderCard(day = "2026-10-05") {
    const rendered = await renderStaffColumn(`/collegue?r2=${day}`, "r2", <StaffDayCardR2 />);
    await expect.element(button("Supprimer ce jour")).toBeVisible();
    return rendered;
  }

  async function openForm(day?: string) {
    const rendered = await renderCard(day);
    await userEvent.click(button(ADD).first());
    await expect.element(field("Nom et prénom")).toHaveFocus();
    return rendered;
  }

  async function fillPerson(name: string) {
    await userEvent.type(field("Nom et prénom"), name);
    await userEvent.type(field("Classe ou service"), "BTS2");
  }

  describe("button (06 § 8, 05 § 6.3)", () => {
    it("comes first in the dish actions, past days included", async () => {
      await renderCard("2026-10-01");
      const actions = button(ADD).element().parentElement;
      expect(
        [...(actions?.querySelectorAll("button") ?? [])].map((b) => b.textContent),
      ).toStrictEqual([ADD, "Modifier ce plat", "Supprimer ce plat"]);
    });

    it("is absent under a sold-out dish", async () => {
      await renderCard("2026-10-11");
      await expect.element(button("Modifier ce plat").first()).toBeVisible();
      await expect.element(button(ADD)).not.toBeInTheDocument();
    });
  });

  describe("form (06 § 8.1, § 8.3)", () => {
    it("opens with one portion, the stock left and « Sur place » alone on a voucher day (D-19)", async () => {
      const { router } = await openForm();
      expect(urlParams(router)).toStrictEqual([`ajout=r2:${LASAGNES}`, "r2=2026-10-05"]);
      await expect.element(button(ADD).first()).toHaveAttribute("aria-expanded", "true");
      await expect.element(field("Portions (4 au maximum)")).toHaveValue("1");
      expect(page.getByRole("radio").elements()).toHaveLength(1);
      await expect.element(page.getByRole("radio", { name: "Sur place" })).toBeChecked();
    });

    it("offers « À emporter » first and by default on a day without voucher dish", async () => {
      await openForm("2026-10-13");
      await expect.element(page.getByRole("radio", { name: "À emporter" })).toBeChecked();
      expect(page.getByRole("radio").elements()).toHaveLength(2);
    });

    it("checks the portions against the stock left before sending", async () => {
      await openForm();
      await fillPerson("Inès Haddad");
      await userEvent.clear(field(/^Portions/u));
      await userEvent.type(field(/^Portions/u), "5");
      await userEvent.click(submit());
      await expect
        .element(field(/^Portions/u))
        .toHaveAccessibleDescription("4 portions au maximum (stock restant).");
      await userEvent.clear(field(/^Portions/u));
      await expect
        .element(field(/^Portions/u))
        .toHaveAccessibleDescription("Indiquez une quantité supérieure à 0.");
      expect(orders()).toStrictEqual([]);
    });
  });

  describe("sending (06 § 8.3, § 8.5, 02 § 4.5)", () => {
    it("sends this dish only, without password, after 10:00 too, then closes and gives the focus back", async () => {
      const { router } = await openForm("2026-10-13");
      // 10:30 in Paris: the staff are not bound by the cutoff (06 § 8.4).
      vi.setSystemTime(Date.parse("2026-10-05T08:30:00.000Z"));
      useClock.setState({ now: Date.now() });
      await fillPerson("Inès Haddad");
      await userEvent.click(submit());
      await expectToast("Personne ajoutée.");
      expect(orders()).toStrictEqual([
        [
          "addBookingR2Multi",
          "2026-10-13",
          "Inès Haddad",
          "",
          "BTS2",
          expect.any(String),
          expect.any(Array),
          "",
          expect.any(String),
        ],
      ]);
      const items = orders()[0]?.[6] as Array<Record<string, unknown>>;
      expect(items.map((item) => Object.values(item))).toStrictEqual([["r2i-d+8-lasagnes", 1]]);
      await expect.element(field("Nom et prénom")).not.toBeInTheDocument();
      // Lasagnes, first dish of the day.
      await expect.element(button(ADD).first()).toHaveFocus();
      expect(urlParams(router)).toStrictEqual(["r2=2026-10-13"]);
      // The mode sent reads on the line (no script value out of api/).
      await expect
        .element(page.getByText(/^Inès Haddad — BTS2 — 1 portion — .+ — à emporter$/u))
        .toBeVisible();
    });

    it("sends dine-in on a voucher day and says when fewer portions were granted", async () => {
      await openForm();
      await fillPerson("Inès Haddad");
      await userEvent.clear(field(/^Portions/u));
      await userEvent.type(field(/^Portions/u), "4");
      await otherOrder(3);
      await userEvent.click(submit());
      await expectToast("Personne ajoutée avec 1 portion seulement (stock restant).");

      await expect
        .element(page.getByText(/^Inès Haddad — BTS2 — 1 portion — .+ — sur place$/u))
        .toBeVisible();
    });

    it("keeps the form and its requestId when nothing was granted", async () => {
      await openForm();
      await fillPerson("Inès Haddad");
      await otherOrder(4);
      await userEvent.click(submit());
      await expectToast("Plus assez de portions disponibles pour ce plat.");
      await expect.element(field("Nom et prénom")).toHaveValue("Inès Haddad");
      // The state of the answer is read: no portion left.
      await expect.element(field("Portions (0 au maximum)")).toBeVisible();
    });

    it("words a technical failure with the staff text of D-14, form kept", async () => {
      await openForm();
      await fillPerson("Inès Haddad");
      fakeScript().failNext("html");
      await userEvent.click(submit());
      await expectToast("Le service ne répond pas. Réessayez dans un instant.");
      await expect.element(field("Nom et prénom")).toHaveValue("Inès Haddad");
    });

    it("« Annuler » sends nothing and gives the focus back to the button (E-48)", async () => {
      await openForm();
      await userEvent.click(button("Annuler"));
      await expect.element(field("Nom et prénom")).not.toBeInTheDocument();
      await expect.element(button(ADD).first()).toHaveFocus();
      expect(orders()).toStrictEqual([]);
    });
  });
});

describe("toast and URL value (06 § 8.5, PLAN § 3.2)", () => {
  // Toast after « Ajouter cette personne » (06 § 8.5) and the URL value of the open form (PLAN § 3.2).

  const DUPLICATE =
    "Cette personne était déjà enregistrée : elle n'a pas été ajoutée une seconde fois.";
  const EMAIL_FAILED = "L'email de confirmation n'a pas pu être envoyé.";

  function response(duplicate: boolean, emailStatus: EmailStatus | null): WriteResponse {
    return { state: {} as WriteResponse["state"], duplicate, emailStatus, bookingResult: null };
  }

  const SENT = { sent: true, reason: null };
  const NO_EMAIL = { sent: false, reason: "no-email" };
  const QUOTA = { sent: false, reason: "Service invoked too many times for one day: email." };

  describe("addedToast (06 § 8.5)", () => {
    it.each([
      ["sent", response(false, SENT), undefined, { text: "Personne ajoutée.", kind: "success" }],
      [
        "no address",
        response(false, NO_EMAIL),
        undefined,
        { text: "Personne ajoutée.", kind: "success" },
      ],
      [
        "R2 granted in full",
        response(false, SENT),
        { asked: 2, got: 2 },
        { text: "Personne ajoutée.", kind: "success" },
      ],
      [
        "R2 granted in part",
        response(false, SENT),
        { asked: 4, got: 1 },
        { text: "Personne ajoutée avec 1 portion seulement (stock restant).", kind: "success" },
      ],
      [
        "R2 granted in part, plural",
        response(false, NO_EMAIL),
        { asked: 4, got: 3 },
        { text: "Personne ajoutée avec 3 portions seulement (stock restant).", kind: "success" },
      ],
      [
        "e-mail failed",
        response(false, QUOTA),
        undefined,
        { text: `Personne ajoutée. ${EMAIL_FAILED}`, kind: "error" },
      ],
      [
        "R2 in part, e-mail failed",
        response(false, QUOTA),
        { asked: 4, got: 1 },
        {
          text: `Personne ajoutée avec 1 portion seulement (stock restant). ${EMAIL_FAILED}`,
          kind: "error",
        },
      ],
      ["duplicate", response(true, null), undefined, { text: DUPLICATE, kind: "neutral" }],
    ] as const)("%s", (_case, answer, granted, expected) => {
      expect(addedToast(answer, granted)).toStrictEqual(expected);
    });
  });

  describe("ajoutValue (PLAN § 3.2)", () => {
    it("names the R1 card or one dish of the R2 card", () => {
      const dishId = "r2i-d0-lasagnes";
      expect(ajoutValue()).toBe("r1");
      expect(ajoutValue(dishId)).toBe(`r2:${dishId}`);
      expect(addButtonId(ajoutValue(dishId))).toBe(`add-person-r2-${dishId}`);
    });
  });
});
