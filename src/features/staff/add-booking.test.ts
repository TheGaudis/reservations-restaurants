import { describe, expect, it } from "vitest";

import type { EmailStatus, WriteResponse } from "@/domain/types";
import { addButtonId, addedToast, ajoutValue } from "@/features/staff/add-booking";

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
