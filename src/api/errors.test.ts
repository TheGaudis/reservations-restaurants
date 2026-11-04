import { describe, expect, it } from "vitest";

import {
  asError,
  BusinessError,
  errorMessage,
  PasswordRejectedError,
  scriptError,
  ServiceError,
} from "@/api/errors";

describe("scriptError (02 § 1.4, § 2)", () => {
  it.each([
    [{ error: "Mot de passe incorrect." }, PasswordRejectedError, "Mot de passe incorrect."],
    [{ error: "Ce jour n'existe plus." }, BusinessError, "Ce jour n'existe plus."],
    [{ error: "Action inconnue: foo" }, BusinessError, "Action inconnue: foo"],
    [{ error: "mot de passe incorrect." }, BusinessError, "mot de passe incorrect."],
  ])("reads %j as a %o", (answer, kind, message) => {
    const error = scriptError(answer);
    expect(error).toBeInstanceOf(kind);
    expect(error?.message).toBe(message);
  });

  it("makes a rejected password a business error, so that a read never retries it", () => {
    expect(scriptError({ error: "Mot de passe incorrect." })).toBeInstanceOf(BusinessError);
  });

  it.each([
    ["a state", { etag: "E1", r1Days: [] }],
    ["an empty error", { error: "" }],
    ["an error that is not text", { error: 12 }],
    ["null", null],
    ["a string", "Mot de passe incorrect."],
  ])("finds no error in %s", (_label, answer) => {
    expect(scriptError(answer)).toBeNull();
  });
});

describe("errorMessage", () => {
  it("returns the script's message, shown as is (02 § 4)", () => {
    expect(errorMessage(new BusinessError("Il ne reste que 2 couvert(s) pour ce jour."))).toBe(
      "Il ne reste que 2 couvert(s) pour ce jour.",
    );
    expect(errorMessage(new PasswordRejectedError("Mot de passe incorrect."))).toBe(
      "Mot de passe incorrect.",
    );
  });

  it.each([
    ["a ServiceError", new ServiceError("No answer from the script.")],
    ["a TypeError", new TypeError("Failed to fetch")],
    ["a string", "Failed to fetch"],
  ])("returns null for %s: never a raw English message (a-3)", (_label, error) => {
    expect(errorMessage(error)).toBeNull();
  });
});

describe("asError", () => {
  it("keeps an Error, wraps anything else in a ServiceError", () => {
    const error = new TypeError("Failed to fetch");
    expect(asError(error)).toBe(error);
    expect(asError("boom")).toBeInstanceOf(ServiceError);
    expect(asError("boom").cause).toBe("boom");
  });

  it("names each class, for the logs", () => {
    expect(
      [new BusinessError("x"), new PasswordRejectedError("x"), new ServiceError("x")].map(
        (e) => e.name,
      ),
    ).toStrictEqual(["BusinessError", "PasswordRejectedError", "ServiceError"]);
  });
});
