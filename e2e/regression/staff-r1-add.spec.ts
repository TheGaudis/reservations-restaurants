import { expect, test } from "../fixtures";
import { selectDay, showPeriod } from "../pages/calendar";
import { toast, toastKind } from "../pages/home";
import { bookingRow, openAddPerson, staffCard } from "../pages/staff";
import { actionBodies, loginAsStaff } from "./staff-helpers";

// « + Ajouter une personne » on the R1 card (09 § 4: C-12; 06 § 8; invariant 3).

const DUPLICATE =
  "Cette personne était déjà enregistrée : elle n'a pas été ajoutée une seconde fois.";

test.use({ reducedMotion: "reduce" });

test(
  "r1StaffAddPerson (REG-36)",
  { tag: ["@parity", "@C-12", "@p5"] },
  async ({ page, fakeScript }) => {
    await loginAsStaff(page);
    const card = staffCard(page, "r1");
    const addPerson = card.getByRole("button", { name: "+ Ajouter une personne", exact: true });

    // 06 § 8: shown while seats are left, past days included.
    await showPeriod(page, "r1", "previous");
    await selectDay(page, "r1", "2026-10-01");
    await expect(addPerson).toBeVisible();
    await showPeriod(page, "r1", "next");
    await selectDay(page, "r1", "2026-10-09");
    await expect(card).toContainText("0 / 10 couverts");
    await expect(addPerson).toHaveCount(0);

    await selectDay(page, "r1", "2026-10-06");
    await openAddPerson(page, "r1");
    await expect(addPerson).toHaveAttribute("aria-expanded", "true");
    await expect(card.getByLabel("Nom et prénom")).toBeFocused();
    await expect(
      card.getByRole("group", { name: "Nombre de personnes (5 au maximum)" }),
    ).toBeVisible();
    await expect(
      card.getByText("Si elle est indiquée, la confirmation y est envoyée.", { exact: true }),
    ).toBeVisible();

    // E-mail optional, checked when typed; at most the seats left (06 § 8.1-8.2).
    const submit = card.getByRole("button", { name: "Ajouter cette personne", exact: true });
    const email = card.getByLabel("Adresse email (optionnel)");
    await card.getByLabel("Nom et prénom").fill("Zoé Lambert");
    await card.getByLabel("Classe ou service").fill("TS2");
    await email.fill("zoe@");
    await card.getByLabel(/^Élèves/u).fill("6");
    await submit.click();
    await expect(
      card.getByText("Vérifiez votre adresse email (ex. Ariele.gsell@exemple.fr).", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      card.getByText("5 couverts au maximum (places restantes ce jour-là).", { exact: true }),
    ).toBeVisible();
    expect(actionBodies(fakeScript.requests, "addBookingR1")).toStrictEqual([]);

    await email.fill("");
    await card.getByLabel(/^Élèves/u).fill("2");
    await card.getByLabel(/^Personnels/u).fill("1");
    await expect(card.getByText(/· Total :/u)).toHaveText("3 couverts · Total : 16,00 €");
    await submit.click();
    await expect(toast(page)).toHaveText("Personne ajoutée.");
    // Public action: no password (02 § 2), a requestId (invariant 3).
    expect(actionBodies(fakeScript.requests, "addBookingR1")).toStrictEqual([
      {
        action: "addBookingR1",
        date: "2026-10-06",
        nom: "Zoé Lambert",
        contact: "",
        classe: "TS2",
        nbEleve: 2,
        nbProf: 1,
        nbExt: 0,
        observation: "",
        requestId: expect.any(String),
      },
    ]);
    // The answer is the public state: the full state is read again to show the name (06 § 8.5).
    await expect(bookingRow(page, "r1", "Zoé Lambert")).toBeVisible();
    await expect(card.getByLabel("Nom et prénom")).toHaveCount(0);
    expect(actionBodies(fakeScript.requests, "getAdminState").length).toBeGreaterThan(1);

    // Answer lost: the new attempt keeps the requestId and the script answers `_duplicate`.
    await openAddPerson(page, "r1");
    await card.getByLabel("Nom et prénom").fill("Hugo Weber");
    await card.getByLabel("Classe ou service").fill("Vie scolaire");
    await card.getByLabel(/^Extérieurs/u).fill("1");
    fakeScript.failNext("network");
    await submit.click();
    await expect.poll(() => actionBodies(fakeScript.requests, "addBookingR1").length).toBe(2);
    await expect.poll(async () => toastKind(page)).toBe("error");
    await expect(card.getByLabel("Nom et prénom")).toHaveValue("Hugo Weber");
    await submit.click();
    await expect(toast(page)).toHaveText(DUPLICATE);
    expect(await toastKind(page)).toBe("success");
    const [, lost, retry] = actionBodies(fakeScript.requests, "addBookingR1");
    expect(retry?.["requestId"]).toBe(lost?.["requestId"]);
    expect(fakeScript.db.r1Bookings.filter((booking) => booking.Nom === "Hugo Weber")).toHaveLength(
      1,
    );
    await expect(bookingRow(page, "r1", "Hugo Weber")).toBeVisible();
  },
);
