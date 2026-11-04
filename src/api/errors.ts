// Failures of a call to the script (02 § 1.4, § 1.6, § 2; PLAN § 3.9). Classes are tested with `instanceof`:
// the read retry skips a `BusinessError`, the query and mutation caches close the staff session on a
// `PasswordRejectedError`, and the forms word a `ServiceError` with D-14.

/** Exact answer of Code.gs to a protected action with a missing or wrong password (02 § 2). */
const PASSWORD_REJECTED = "Mot de passe incorrect.";

/** `{ error: "…" }` answered by the script (02 § 1.4): its French message is shown as is. */
export class BusinessError extends Error {
  override name = "BusinessError";
}

/** `Mot de passe incorrect.`: wrong password at login, or password changed during a staff session (02 § 2). */
export class PasswordRejectedError extends BusinessError {
  override name = "PasswordRejectedError";
}

/**
 * No usable answer: network failure, Google's HTML error page (without CORS it surfaces as a `TypeError`, with
 * CORS as unreadable JSON), timeout of a read, or a shape the schemas refuse (02 § 1.6, R-09). The message is
 * technical and never shown (a-3).
 */
export class ServiceError extends Error {
  override name = "ServiceError";
}

/** Any failure as an `Error`: a value thrown that is not one counts as a technical failure. */
export function asError(error: unknown): Error {
  return error instanceof Error ? error : new ServiceError("Unexpected failure.", { cause: error });
}

/** The error carried by a script answer, or null when the answer is not `{ error }` (02 § 1.4). */
export function scriptError(json: unknown): BusinessError | null {
  if (typeof json !== "object" || json === null || !("error" in json)) return null;
  const { error } = json;
  // Code.gs answers `{ error: e.message }`; the old client tested `data.error` for truthiness.
  if (typeof error !== "string" || error === "") return null;
  return error === PASSWORD_REJECTED ? new PasswordRejectedError(error) : new BusinessError(error);
}

/**
 * Message of the script, shown as is (02 § 4); null for a technical failure, which the caller words with D-14
 * or 03 § 3.1 according to `navigator.onLine`.
 */
export function errorMessage(error: unknown): string | null {
  return error instanceof BusinessError ? error.message : null;
}
