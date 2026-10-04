import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { deleteBookingR2, editBookingR2 } from "@/api/actions";
import { useClock } from "@/background/clock";
import { StaffDayCardR2 } from "@/features/staff/StaffDayCardR2";
import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { useSessionStore } from "@/session/session";
import { fakeScript } from "@/test/browser-fake-script";
import { TEST_NOW } from "@/test/clock";
import { renderColumn } from "@/test/column-page";
import { urlParams } from "@/test/public-page";

// R2 bookings of the staff card and their « Modifier » (05 § 4.6, § 6.3; 06 § 7.4; D-19, D-21; E-36, E-48; C-20,
// C-24), on the seed of parite.md § 2: today's Lasagnes (stock 10) have 6 portions booked, Cyrille Ungerer 4 of them;
// today is a voucher day. On Sunday 11 October, Noah Bernard takes 3 Couscous away (no voucher dish).

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(TEST_NOW);
  useSessionStore.getState().open(SEED_PASSWORD);
});

const initialClock = useClock.getState();

afterEach(() => {
  useClock.setState(initialClock, true);
  vi.useRealTimers();
});

const field = (name: string | RegExp) => page.getByRole("textbox", { name });
const save = () => page.getByRole("button", { name: /^(Enregistrer|Enregistrement…)$/u });
/** Row of a booking (05 § 4.6) by the booked person's name in bold. */
function rowOf(name: string) {
  const bold = [...document.querySelectorAll("section b")].find(
    (element) => element.textContent === name,
  );
  const row = bold?.closest("div");
  if (row === null || row === undefined) throw new Error(`No booking row for ${name}.`);
  return page.elementLocator(row);
}

const editButtonOf = (name: string) =>
  rowOf(name).getByRole("button", { name: "Modifier", exact: true });

function edits() {
  return fakeScript()
    .requests.filter((request) => request.method === "POST")
    .map((request) => request.json as Record<string, unknown>)
    .filter((body) => Object.values(body)[0] === "editBookingR2");
}

function lineTexts(): string[] {
  return [...document.querySelectorAll("section b")].map(
    (name) => name.parentElement?.textContent ?? "",
  );
}

async function renderCard(url = "/collegue") {
  const rendered = await renderColumn(url, "r2", <StaffDayCardR2 />);
  await expect.element(page.getByText(/^Ouvert par/u)).toBeVisible();
  return rendered;
}

async function openForm(name: string, url?: string) {
  const rendered = await renderCard(url);
  await userEvent.click(editButtonOf(name));
  await expect.element(field("Nom")).toHaveValue(name);
  return rendered;
}

describe("lines under each dish (05 § 4.6, § 6.3)", () => {
  it("shows portions, amount of the dish and mode in lower case; orphans nowhere (D-21)", async () => {
    await renderCard("/collegue?r2=2026-10-06");
    expect(lineTexts()).toStrictEqual([
      "Noah Bernard — TS1 — 1 portion — 4,50 € — sur place — n.bernard@exemple.fr — Sans fromage",
      "Ariele Gsell — Vie scolaire — 3 portions — 3 tickets restaurant — sur place — a.gsell@exemple.fr",
    ]);
    await expect.element(page.getByText("Paul Durand")).not.toBeInTheDocument();
  });

  it("says « à emporter » and « Aucune réservation. » for a dish without bookings", async () => {
    await deleteBookingR2(SEED_PASSWORD, "r2b-d+6-gsell");
    await renderCard("/collegue?r2=2026-10-11");
    expect(lineTexts()).toStrictEqual([
      "Noah Bernard — TS1 — 3 portions — 18,00 € — à emporter — n.bernard@exemple.fr",
    ]);
    await expect.element(page.getByText("Aucune réservation.", { exact: true })).toBeVisible();
  });
});

describe("edit form (06 § 7.4)", () => {
  it("offers « Sur place » alone on a voucher day (D-19, E-36) and shows the booking", async () => {
    const { router } = await openForm("Cyrille Ungerer");
    expect(urlParams(router)).toStrictEqual(["editResa=r2:r2b-d0-ungerer"]);
    await expect.element(field("Téléphone ou email")).toHaveValue("c.ungerer@exemple.fr");
    await expect.element(field("Portions")).toHaveValue("4");
    await expect.element(page.getByRole("radio")).toHaveLength(1);
    await expect.element(page.getByRole("radio", { name: "Sur place" })).toBeChecked();
    await expect
      .element(page.getByRole("button", { name: "Ajouter une portion : Lasagnes" }))
      .toBeInTheDocument();
  });

  it("offers both modes on another day, the booking's mode chosen", async () => {
    await openForm("Noah Bernard", "/collegue?r2=2026-10-11");
    await expect.element(page.getByRole("radio", { name: "À emporter" })).toBeChecked();
    await expect.element(page.getByRole("radio", { name: "Sur place" })).not.toBeChecked();
  });

  it("bounds the portions by the stock left plus the booking's own (D-19), and requires one", async () => {
    await openForm("Cyrille Ungerer");
    await userEvent.clear(field("Portions"));
    await userEvent.type(field("Portions"), "9");
    await userEvent.click(save());
    await expect.element(field("Portions")).toHaveAttribute("aria-invalid", "true");
    await expect
      .element(page.getByText("8 portions au maximum (stock restant).", { exact: true }))
      .toBeVisible();
    await userEvent.clear(field("Portions"));
    await expect
      .element(page.getByText("Indiquez une quantité supérieure à 0.", { exact: true }))
      .toBeVisible();
    expect(edits()).toStrictEqual([]);
  });

  it("sends the line, toasts, closes and gives the focus back to « Modifier » (E-48)", async () => {
    await openForm("Cyrille Ungerer");
    await userEvent.clear(field("Portions"));
    await userEvent.type(field("Portions"), "3");
    await userEvent.type(field("Observation (optionnel)"), "  Sans sauce ");
    await userEvent.click(save());
    await expect
      .element(page.getByText("Réservation modifiée.", { exact: true }).first())
      .toBeVisible();
    // 02 § 4.7, in the order of the body: id, name, contact, class, portions, mode, observation (trimmed).
    expect(edits().map((body) => Object.values(body))).toStrictEqual([
      [
        "editBookingR2",
        SEED_PASSWORD,
        "r2b-d0-ungerer",
        "Cyrille Ungerer",
        "c.ungerer@exemple.fr",
        "TS2",
        3,
        expect.any(String),
        "Sans sauce",
      ],
    ]);
    await expect.element(field("Nom")).not.toBeInTheDocument();
    await expect.element(editButtonOf("Cyrille Ungerer")).toHaveFocus();
    await expect
      .element(page.getByText(/^Cyrille Ungerer — TS2 — 3 portions — 13,50.€ — sur place — /u))
      .toBeVisible();
  });

  it("sends « Sur place » on a voucher day even for a booking taken away", async () => {
    await editBookingR2(SEED_PASSWORD, {
      id: "r2b-d0-ungerer",
      name: "Cyrille Ungerer",
      contact: "c.ungerer@exemple.fr",
      className: "TS2",
      portions: 4,
      serviceMode: "takeaway",
      observation: "",
    });
    await renderCard();
    await expect.element(page.getByText(/ — à emporter — c\.ungerer/u)).toBeVisible();
    await userEvent.click(editButtonOf("Cyrille Ungerer"));
    await userEvent.click(save());
    await expect
      .element(page.getByText("Réservation modifiée.", { exact: true }).first())
      .toBeVisible();
    await expect.element(page.getByText(/ — sur place — c\.ungerer/u)).toBeVisible();
  });

  it("shows the script's refusal for lack of stock under the portions", async () => {
    await openForm("Cyrille Ungerer");
    fakeScript().failNext("error", "Il ne reste que 2 portion(s) disponible(s) pour ce plat.");
    await userEvent.click(save());
    await expect
      .element(field("Portions"))
      .toHaveAccessibleDescription("Il ne reste que 2 portion(s) disponible(s) pour ce plat.");
  });
});
