import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { addBookingR1 } from "@/api/actions";
import { useClock } from "@/background/clock";
import { StaffDayCardR1 } from "@/features/staff/StaffDayCardR1";
import { SEED_PASSWORD } from "@/mocks/fixtures/seed";
import { stateKeys } from "@/queries/state";
import { useSessionStore } from "@/session/session";
import { fakeScript } from "@/test/browser-fake-script";
import { TEST_NOW } from "@/test/clock";
import { renderColumn } from "@/test/column-page";
import { urlParams } from "@/test/public-page";

// « Modifier » of an R1 booking (06 § 7.2-7.3; D-04 and D-08 not retained; D-14, D-19; E-48; C-11), on the seed of
// parite.md § 2: Tuesday 6 October 2026 has 5 seats left out of 20; Cyrille Ungerer booked 3 (2 students, 1 staff),
// Jean Petit 4 before the prices.

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
const button = (name: string) => page.getByRole("button", { name, exact: true });
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
    .filter((body) => Object.values(body)[0] === "editBookingR1");
}

async function openForm(name = "Cyrille Ungerer") {
  const rendered = await renderColumn("/collegue?r1=2026-10-06", "r1", <StaffDayCardR1 />);
  await userEvent.click(editButtonOf(name));
  await expect.element(field("Nom")).toHaveValue(name);
  return rendered;
}

describe("opening (06 § 7.2-7.3)", () => {
  it("shows the booking: identity, counters with the prices, maximum and live total", async () => {
    await openForm();
    await expect.element(field("Classe ou service")).toHaveValue("TS2");
    await expect.element(field("Téléphone ou email")).toHaveValue("c.ungerer@exemple.fr");
    await expect.element(field("Élèves · 4,95 €")).toHaveValue("2");
    await expect.element(field("Personnels · 6,10 €")).toHaveValue("1");
    await expect.element(field("Extérieurs · 9,90 €")).toHaveValue("0");
    await expect.element(field("Observation (optionnel)")).toHaveValue("Table près de la fenêtre");
    // Seats left (5) plus the booking's own (3): editMaxR1 (06 § 7.3, D-19).
    await expect
      .element(page.getByRole("group", { name: "Nombre de personnes (8 au maximum)" }))
      .toBeVisible();
    await expect
      .element(page.getByText("3 couverts · Total : 16,00 €", { exact: true }))
      .toBeVisible();
    await expect
      .element(page.getByText(/^Réservation enregistrée avant les tarifs/u))
      .not.toBeInTheDocument();
  });

  it("leaves the counters of a booking made before the prices empty, with the help (06 § 7.3)", async () => {
    await openForm("Jean Petit");
    await expect.element(field(/^Élèves/u)).toHaveValue("");
    await expect.element(field(/^Personnels/u)).toHaveValue("");
    await expect.element(field(/^Extérieurs/u)).toHaveValue("");
    await expect
      .element(
        page.getByText(
          "Réservation enregistrée avant les tarifs : indiquez la répartition de ses 4 couverts.",
          { exact: true },
        ),
      )
      .toBeVisible();
    await expect
      .element(page.getByRole("group", { name: "Nombre de personnes (9 au maximum)" }))
      .toBeVisible();
  });
});

describe("checks before sending (06 § 7.2-7.3)", () => {
  it("keeps the contact required, without a format (D-04 not retained), and every message at once", async () => {
    await openForm();
    await userEvent.clear(field("Nom"));
    await userEvent.clear(field("Classe ou service"));
    await userEvent.clear(field("Téléphone ou email"));
    await userEvent.click(save());
    await expect.element(page.getByText("Indiquez le nom.", { exact: true })).toBeVisible();
    await expect
      .element(page.getByText("Indiquez la classe ou le service.", { exact: true }))
      .toBeVisible();
    await expect
      .element(page.getByText("Indiquez un téléphone ou un email.", { exact: true }))
      .toBeVisible();
    await expect.element(field("Nom")).toHaveFocus();
    // A phone number is a contact.
    await userEvent.type(field("Téléphone ou email"), "06 00 00 00 00");
    await expect
      .element(page.getByText("Indiquez un téléphone ou un email.", { exact: true }))
      .not.toBeInTheDocument();
    expect(edits()).toStrictEqual([]);
  });

  it("refuses more seats than the maximum of this booking, and no seat at all", async () => {
    await openForm();
    await userEvent.clear(field(/^Élèves/u));
    await userEvent.type(field(/^Élèves/u), "9");
    await userEvent.click(save());
    await expect
      .element(
        page.getByText(
          "8 couverts au maximum pour cette réservation (places restantes ce jour-là).",
          { exact: true },
        ),
      )
      .toBeVisible();
    await userEvent.clear(field(/^Élèves/u));
    await userEvent.clear(field(/^Personnels/u));
    await expect
      .element(page.getByText("Indiquez au moins une personne.", { exact: true }))
      .toBeVisible();
    expect(edits()).toStrictEqual([]);
  });
});

describe("sending (06 § 7.3, 02 § 4.7)", () => {
  it("sends qte and prixTotal, toasts, closes and gives the focus back to « Modifier » (E-48)", async () => {
    const { router } = await openForm();
    const release = fakeScript().hold();
    await userEvent.type(field(/^Extérieurs/u), "1");
    await userEvent.click(save());
    await expect.element(save()).toHaveTextContent("Enregistrement…");
    await expect.element(button("Annuler")).toBeDisabled();
    release();
    await expect
      .element(page.getByText("Réservation modifiée.", { exact: true }).first())
      .toBeVisible();
    // 02 § 4.7, in the order of the body: id, name, contact, class, seats, the three counters, total, observation.
    expect(edits().map((body) => Object.values(body))).toStrictEqual([
      [
        "editBookingR1",
        SEED_PASSWORD,
        "r1b-d+1-ungerer",
        "Cyrille Ungerer",
        "c.ungerer@exemple.fr",
        "TS2",
        4,
        2,
        1,
        1,
        25.9,
        "Table près de la fenêtre",
      ],
    ]);
    await expect.element(field("Nom")).not.toBeInTheDocument();
    await expect.element(editButtonOf("Cyrille Ungerer")).toHaveFocus();
    expect(urlParams(router)).toStrictEqual(["r1=2026-10-06"]);
    await expect
      .element(page.getByText(/^Cyrille Ungerer — TS2 — 4 couverts — 25,90/u))
      .toBeVisible();
  });

  it("shows the script's refusal for lack of seats under the counters, and reads the state again", async () => {
    await openForm();
    const reads = () =>
      fakeScript().requests.filter(
        (request) => (request.json as { action?: string } | null)?.action === "getAdminState",
      ).length;
    const readsBefore = reads();
    fakeScript().failNext("error", "Il ne reste que 2 couvert(s) disponible(s) pour ce jour.");
    await userEvent.click(save());
    await expect
      .element(field(/^Élèves/u))
      .toHaveAccessibleDescription("Il ne reste que 2 couvert(s) disponible(s) pour ce jour.");
    await expect.poll(reads).toBe(readsBefore + 1);
    await expect.element(field("Nom")).toHaveValue("Cyrille Ungerer");
  });

  it("shows another refusal of the script in a toast, form kept", async () => {
    await openForm();
    fakeScript().failNext("error", "Réservation introuvable.");
    await userEvent.click(save());
    await expect
      .element(page.getByText("Réservation introuvable.", { exact: true }).first())
      .toBeVisible();
    await expect.element(field("Nom")).toHaveValue("Cyrille Ungerer");
  });
});

describe("closing and refresh", () => {
  it("« Annuler » sends nothing and gives the focus back to « Modifier » (E-48)", async () => {
    const { router } = await openForm();
    await userEvent.click(button("Annuler"));
    await expect.element(field("Nom")).not.toBeInTheDocument();
    await expect.element(editButtonOf("Cyrille Ungerer")).toHaveFocus();
    await expect.element(editButtonOf("Cyrille Ungerer")).toHaveAttribute("aria-expanded", "false");
    expect(urlParams(router)).toStrictEqual(["r1=2026-10-06"]);
    expect(edits()).toStrictEqual([]);
  });

  it("keeps what was typed and the focus through a refresh, the maximum follows (03 § 5.4)", async () => {
    const { queryClient } = await openForm();
    await userEvent.clear(field("Nom"));
    await userEvent.type(field("Nom"), "Cyrille U.");
    // Another colleague adds 2 seats on that day.
    await addBookingR1({
      date: "2026-10-06",
      name: "Autre Collègue",
      contact: "",
      className: "Personnel",
      students: 0,
      staffMembers: 2,
      externals: 0,
      observation: "",
      requestId: "other-colleague",
    });
    await queryClient.invalidateQueries({ queryKey: stateKeys.staffAll() });
    await expect
      .element(page.getByRole("group", { name: "Nombre de personnes (6 au maximum)" }))
      .toBeVisible();
    await expect.element(field("Nom")).toHaveValue("Cyrille U.");
    await expect.element(field("Nom")).toHaveFocus();
  });
});
