import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { addBookingR2Multi } from "@/api/actions";
import { useClock } from "@/background/clock";
import { StaffDayCardR2 } from "@/features/staff/StaffDayCardR2";
import { fakeScript } from "@/test/browser-fake-script";
import { TEST_NOW } from "@/test/clock";
import { urlParams } from "@/test/public-page";
import { actionPosts, expectToast, renderStaffColumn } from "@/test/staff-column";

// « + Ajouter une personne » under each dish of the R2 staff card (06 § 8.1, § 8.3-8.5; D-19; E-36; E-48; C-23), on
// the seed of parite.md § 2: today's Lasagnes have 4 portions left out of 10, today is a voucher day; on Tuesday
// 13 October no dish is paid with a voucher; on Sunday 11 October every dish is sold out.

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
const LASAGNES = "r2i-d0-lasagnes";
const field = (name: string | RegExp) => page.getByRole("textbox", { name });
const button = (name: string) => page.getByRole("button", { name, exact: true });
const submit = () =>
  page.getByRole("button", { name: /^(Ajouter cette personne|Ajout en cours…)$/u });

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
